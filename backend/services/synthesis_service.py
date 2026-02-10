"""
Synthesis service - Synth management and playback
"""
import logging
from typing import Dict, List, Optional
from ..core.engine_manager import AudioEngineManager
from ..models.synth import Synth, SynthDef

logger = logging.getLogger(__name__)


class SynthesisService:
    """
    Synthesis service
    Manages SynthDefs, voice allocation, and synth playback
    """

    def __init__(self, engine: AudioEngineManager):
        """
        Initialize synthesis service

        Args:
            engine: Audio engine manager instance
        """
        self.engine = engine

        # Track active synths
        self.synths: Dict[int, Synth] = {}
        self.next_synth_id = 1000

        # SynthDef library
        self.synthdefs: Dict[str, SynthDef] = {}

        # Load default SynthDefs
        self._load_default_synthdefs()

    def _load_default_synthdefs(self):
        """Load comprehensive SynthDef library with LLM-friendly metadata"""

        # ===== BASIC OSCILLATORS =====
        self._register_basic_synthdefs()

        # ===== DRUMS =====
        self._register_drum_synthdefs()

        # ===== BASS =====
        self._register_bass_synthdefs()

        # ===== LEADS =====
        self._register_lead_synthdefs()

        # ===== PADS =====
        self._register_pad_synthdefs()

        logger.info(f"Loaded {len(self.synthdefs)} SynthDefs across all categories")

    def _register_basic_synthdefs(self):
        """Register basic oscillator SynthDefs"""
        self.synthdefs["sine"] = SynthDef(
            name="sine",
            parameters={"freq": 440.0, "amp": 0.5, "gate": 1, "attack": 0.01, "release": 0.3, "out": 0},
            description="Pure sine wave - smooth, fundamental tone",
            category="basic",
            parameter_ranges={
                "freq": (20.0, 20000.0),
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (0.001, 5.0),
                "release": (0.01, 10.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "out": "Output bus number"
            }
        )

        self.synthdefs["saw"] = SynthDef(
            name="saw",
            parameters={"freq": 440.0, "amp": 0.5, "gate": 1, "attack": 0.01, "release": 0.3,
                       "cutoff": 2000.0, "resonance": 0.3, "out": 0},
            description="Sawtooth wave - bright, rich harmonics with filter",
            category="basic",
            parameter_ranges={
                "freq": (20.0, 20000.0),
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (0.001, 5.0),
                "release": (0.01, 10.0),
                "cutoff": (20.0, 20000.0),
                "resonance": (0.1, 1.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "cutoff": "Filter cutoff frequency in Hz",
                "resonance": "Filter resonance (0-1)",
                "out": "Output bus number"
            }
        )

        self.synthdefs["square"] = SynthDef(
            name="square",
            parameters={"freq": 440.0, "amp": 0.5, "gate": 1, "attack": 0.01, "release": 0.3,
                       "width": 0.5, "out": 0},
            description="Square/pulse wave - hollow, retro sound",
            category="basic",
            parameter_ranges={
                "freq": (20.0, 20000.0),
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (0.001, 5.0),
                "release": (0.01, 10.0),
                "width": (0.01, 0.99),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "width": "Pulse width (0.5 = square wave)",
                "out": "Output bus number"
            }
        )

        self.synthdefs["triangle"] = SynthDef(
            name="triangle",
            parameters={"freq": 440.0, "amp": 0.5, "gate": 1, "attack": 0.01, "release": 0.3, "out": 0},
            description="Triangle wave - soft, mellow tone",
            category="basic",
            parameter_ranges={
                "freq": (20.0, 20000.0),
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (0.001, 5.0),
                "release": (0.01, 10.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "out": "Output bus number"
            }
        )

        self.synthdefs["noise"] = SynthDef(
            name="noise",
            parameters={"amp": 0.5, "gate": 1, "attack": 0.01, "release": 0.3,
                       "cutoff": 5000.0, "out": 0},
            description="White noise generator with filter",
            category="basic",
            parameter_ranges={
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (0.001, 5.0),
                "release": (0.01, 10.0),
                "cutoff": (20.0, 20000.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "cutoff": "Filter cutoff frequency in Hz",
                "out": "Output bus number"
            }
        )

    def _register_drum_synthdefs(self):
        """Register drum SynthDefs"""
        self.synthdefs["kick"] = SynthDef(
            name="kick",
            parameters={"amp": 0.8, "freq": 60.0, "decay": 0.3, "click": 0.5, "out": 0},
            description="Kick drum - deep bass drum",
            category="drums",
            parameter_ranges={
                "amp": (0.0, 1.0),
                "freq": (30.0, 150.0),
                "decay": (0.05, 2.0),
                "click": (0.0, 1.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "amp": "Amplitude/volume (0-1)",
                "freq": "Base frequency in Hz",
                "decay": "Decay time in seconds",
                "click": "Click amount (0-1)",
                "out": "Output bus number"
            }
        )

        self.synthdefs["snare"] = SynthDef(
            name="snare",
            parameters={"amp": 0.6, "freq": 200.0, "decay": 0.15, "noise": 0.7, "out": 0},
            description="Snare drum - crisp snare",
            category="drums",
            parameter_ranges={
                "amp": (0.0, 1.0),
                "freq": (100.0, 400.0),
                "decay": (0.05, 1.0),
                "noise": (0.0, 1.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "amp": "Amplitude/volume (0-1)",
                "freq": "Tone frequency in Hz",
                "decay": "Decay time in seconds",
                "noise": "Noise amount (0-1)",
                "out": "Output bus number"
            }
        )

        self.synthdefs["hihat"] = SynthDef(
            name="hihat",
            parameters={"amp": 0.4, "decay": 0.1, "cutoff": 8000.0, "out": 0},
            description="Hi-hat - metallic hi-hat",
            category="drums",
            parameter_ranges={
                "amp": (0.0, 1.0),
                "decay": (0.01, 0.5),
                "cutoff": (3000.0, 15000.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "amp": "Amplitude/volume (0-1)",
                "decay": "Decay time in seconds",
                "cutoff": "High-pass filter cutoff in Hz",
                "out": "Output bus number"
            }
        )

        self.synthdefs["clap"] = SynthDef(
            name="clap",
            parameters={"amp": 0.5, "decay": 0.2, "out": 0},
            description="Clap - hand clap",
            category="drums",
            parameter_ranges={
                "amp": (0.0, 1.0),
                "decay": (0.05, 1.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "amp": "Amplitude/volume (0-1)",
                "decay": "Decay time in seconds",
                "out": "Output bus number"
            }
        )

        self.synthdefs["tom"] = SynthDef(
            name="tom",
            parameters={"amp": 0.6, "freq": 120.0, "decay": 0.25, "out": 0},
            description="Tom - tom drum",
            category="drums",
            parameter_ranges={
                "amp": (0.0, 1.0),
                "freq": (60.0, 300.0),
                "decay": (0.1, 2.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "amp": "Amplitude/volume (0-1)",
                "freq": "Frequency in Hz",
                "decay": "Decay time in seconds",
                "out": "Output bus number"
            }
        )

        self.synthdefs["cymbal"] = SynthDef(
            name="cymbal",
            parameters={"amp": 0.5, "decay": 1.0, "out": 0},
            description="Cymbal - crash cymbal",
            category="drums",
            parameter_ranges={
                "amp": (0.0, 1.0),
                "decay": (0.2, 5.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "amp": "Amplitude/volume (0-1)",
                "decay": "Decay time in seconds",
                "out": "Output bus number"
            }
        )

    def _register_bass_synthdefs(self):
        """Register bass SynthDefs"""
        self.synthdefs["subbass"] = SynthDef(
            name="subbass",
            parameters={"freq": 55.0, "amp": 0.7, "gate": 1, "attack": 0.01, "release": 0.5,
                       "cutoff": 200.0, "out": 0},
            description="Sub bass - deep sub-bass",
            category="bass",
            parameter_ranges={
                "freq": (20.0, 200.0),
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (0.001, 1.0),
                "release": (0.01, 5.0),
                "cutoff": (50.0, 500.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "cutoff": "Low-pass filter cutoff in Hz",
                "out": "Output bus number"
            }
        )

        self.synthdefs["acidbass"] = SynthDef(
            name="acidbass",
            parameters={"freq": 110.0, "amp": 0.6, "gate": 1, "attack": 0.01, "release": 0.3,
                       "cutoff": 800.0, "resonance": 0.7, "envAmount": 4000.0, "out": 0},
            description="Acid bass - TB-303 style acid bass",
            category="bass",
            parameter_ranges={
                "freq": (30.0, 300.0),
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (0.001, 0.5),
                "release": (0.01, 2.0),
                "cutoff": (100.0, 5000.0),
                "resonance": (0.1, 1.0),
                "envAmount": (0.0, 10000.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "cutoff": "Filter cutoff frequency in Hz",
                "resonance": "Filter resonance (0-1)",
                "envAmount": "Envelope modulation amount in Hz",
                "out": "Output bus number"
            }
        )

        self.synthdefs["reesebass"] = SynthDef(
            name="reesebass",
            parameters={"freq": 55.0, "amp": 0.6, "gate": 1, "attack": 0.01, "release": 0.5,
                       "detune": 2.0, "cutoff": 1500.0, "out": 0},
            description="Reese bass - detuned saw bass",
            category="bass",
            parameter_ranges={
                "freq": (20.0, 200.0),
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (0.001, 1.0),
                "release": (0.01, 5.0),
                "detune": (0.0, 10.0),
                "cutoff": (100.0, 5000.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "detune": "Detune amount in Hz",
                "cutoff": "Low-pass filter cutoff in Hz",
                "out": "Output bus number"
            }
        )

    def _register_lead_synthdefs(self):
        """Register lead SynthDefs"""
        self.synthdefs["pluck"] = SynthDef(
            name="pluck",
            parameters={"freq": 440.0, "amp": 0.5, "decay": 2.0, "coef": 0.1, "out": 0},
            description="Pluck - plucked string sound",
            category="lead",
            parameter_ranges={
                "freq": (100.0, 2000.0),
                "amp": (0.0, 1.0),
                "decay": (0.1, 10.0),
                "coef": (0.01, 0.99),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "decay": "Decay time in seconds",
                "coef": "Damping coefficient (0-1)",
                "out": "Output bus number"
            }
        )

        self.synthdefs["supersaw"] = SynthDef(
            name="supersaw",
            parameters={"freq": 440.0, "amp": 0.5, "gate": 1, "attack": 0.1, "release": 0.3,
                       "detune": 5.0, "cutoff": 5000.0, "out": 0},
            description="Supersaw - detuned saw lead",
            category="lead",
            parameter_ranges={
                "freq": (100.0, 2000.0),
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (0.001, 2.0),
                "release": (0.01, 5.0),
                "detune": (0.0, 20.0),
                "cutoff": (500.0, 15000.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "detune": "Detune amount (cents)",
                "cutoff": "Low-pass filter cutoff in Hz",
                "out": "Output bus number"
            }
        )

    def _register_pad_synthdefs(self):
        """Register pad SynthDefs"""
        self.synthdefs["warmpad"] = SynthDef(
            name="warmpad",
            parameters={"freq": 220.0, "amp": 0.4, "gate": 1, "attack": 2.0, "release": 3.0,
                       "cutoff": 2000.0, "out": 0},
            description="Warm pad - soft, warm pad",
            category="pad",
            parameter_ranges={
                "freq": (50.0, 1000.0),
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (0.5, 10.0),
                "release": (0.5, 15.0),
                "cutoff": (200.0, 8000.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "cutoff": "Low-pass filter cutoff in Hz",
                "out": "Output bus number"
            }
        )

        self.synthdefs["strings"] = SynthDef(
            name="strings",
            parameters={"freq": 220.0, "amp": 0.4, "gate": 1, "attack": 1.5, "release": 2.5,
                       "vibrato": 5.0, "out": 0},
            description="Strings - string ensemble",
            category="pad",
            parameter_ranges={
                "freq": (50.0, 1000.0),
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (0.5, 10.0),
                "release": (0.5, 15.0),
                "vibrato": (0.0, 10.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "vibrato": "Vibrato rate in Hz",
                "out": "Output bus number"
            }
        )

        self.synthdefs["ambient"] = SynthDef(
            name="ambient",
            parameters={"freq": 220.0, "amp": 0.3, "gate": 1, "attack": 3.0, "release": 4.0, "out": 0},
            description="Ambient - ethereal atmosphere",
            category="pad",
            parameter_ranges={
                "freq": (50.0, 1000.0),
                "amp": (0.0, 1.0),
                "gate": (0, 1),
                "attack": (1.0, 15.0),
                "release": (1.0, 20.0),
                "out": (0, 127)
            },
            parameter_descriptions={
                "freq": "Frequency in Hz (pitch)",
                "amp": "Amplitude/volume (0-1)",
                "gate": "Note on/off (1=on, 0=off)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "out": "Output bus number"
            }
        )

    async def create_synth(
        self,
        synthdef: str,
        parameters: Optional[Dict[str, float]] = None,
        group: int = 1,
        bus: Optional[int] = None
    ) -> Synth:
        """
        Create a new synth instance

        Args:
            synthdef: SynthDef name
            parameters: Initial parameter values
            group: Target group ID
            bus: Output bus ID

        Returns:
            Synth instance
        """
        if synthdef not in self.synthdefs:
            raise ValueError(f"SynthDef '{synthdef}' not found")

        synth_id = self.next_synth_id
        self.next_synth_id += 1

        # Merge default parameters with provided ones
        synthdef_obj = self.synthdefs[synthdef]
        params = {**synthdef_obj.parameters, **(parameters or {})}

        # Add bus if specified
        if bus is not None:
            params["out"] = bus

        synth = Synth(
            id=synth_id,
            synthdef=synthdef,
            group=group,
            parameters=params,
            bus=bus
        )

        self.synths[synth_id] = synth

        # Send OSC message to create synth on SuperCollider
        if self.engine.server and self.engine.is_running:
            try:
                # Build parameter list for OSC message
                # Format: [param1_name, param1_value, param2_name, param2_value, ...]
                osc_params = []
                for key, value in params.items():
                    osc_params.extend([key, value])

                # Send /s_new message: [synthdef_name, node_id, add_action, target_id, ...params]
                # add_action: 0=addToHead, 1=addToTail
                self.engine.server.send_message("/s_new", [synthdef, synth_id, 1, group] + osc_params)
                logger.info(f"Created synth {synth_id} ({synthdef}) on SuperCollider")
            except Exception as e:
                logger.error(f"Failed to send OSC message for synth creation: {e}")
        else:
            logger.warning(f"Created synth {synth_id} ({synthdef}) but SuperCollider not running")

        return synth

    async def free_synth(self, synth_id: int):
        """Free a synth"""
        if synth_id in self.synths:
            # Send OSC message to free synth on SuperCollider
            if self.engine.server and self.engine.is_running:
                try:
                    # Send /n_free message: [node_id]
                    self.engine.server.send_message("/n_free", [synth_id])
                    logger.info(f"Freed synth {synth_id} on SuperCollider")
                except Exception as e:
                    logger.error(f"Failed to send OSC message for synth free: {e}")

            del self.synths[synth_id]
            logger.info(f"Freed synth {synth_id}")

    async def set_parameter(self, synth_id: int, param: str, value: float):
        """Set synth parameter"""
        if synth_id not in self.synths:
            raise ValueError(f"Synth {synth_id} not found")

        synth = self.synths[synth_id]
        synth.set(param, value)

        # Send OSC message to update parameter on SuperCollider
        if self.engine.server and self.engine.is_running:
            try:
                # Send /n_set message: [node_id, param_name, param_value]
                self.engine.server.send_message("/n_set", [synth_id, param, value])
                logger.debug(f"Set synth {synth_id} {param} = {value} on SuperCollider")
            except Exception as e:
                logger.error(f"Failed to send OSC message for parameter update: {e}")
        else:
            logger.debug(f"Set synth {synth_id} {param} = {value} (SuperCollider not running)")

    def get_synth(self, synth_id: int) -> Optional[Synth]:
        """Get synth by ID"""
        return self.synths.get(synth_id)

    def get_synthdefs(self) -> List[SynthDef]:
        """Get all available SynthDefs"""
        return list(self.synthdefs.values())

    def register_synthdef(self, synthdef: SynthDef):
        """Register a new SynthDef"""
        self.synthdefs[synthdef.name] = synthdef
        logger.info(f"Registered SynthDef: {synthdef.name}")

