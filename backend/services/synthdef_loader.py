"""
SynthDef Loader - Loads essential SynthDefs into SuperCollider
Uses supriya Python library to build SynthDefs and send them via OSC
"""
import logging
import asyncio
from pythonosc import udp_client
from supriya import Envelope, synthdef
from supriya.ugens import EnvGen, In, Impulse, Out, SendReply, SinOsc

logger = logging.getLogger(__name__)


async def load_essential_synthdefs():
    """
    Load essential SynthDefs into SuperCollider using supriya
    This builds SynthDefs in Python and sends them via OSC /d_recv
    NO sclang needed - pure Python!
    """
    try:
        logger.info("🎵 Loading essential SynthDefs into SuperCollider...")

        # Define audioMonitor SynthDef
        @synthdef()
        def audioMonitor(targetBus=0, sendRate=60):
            # Read stereo signal from target bus
            sig = In.ar(bus=targetBus, channel_count=2)
            left = sig[0]
            right = sig[1]

            # Send audio samples at regular intervals
            trig = Impulse.kr(frequency=sendRate)

            # SendReply sends to sclang (port 57120) which forwards to Python (port 57121)
            # In supriya, the parameter is 'source' not 'values'
            SendReply.kr(
                trigger=trig,
                command_name="/audio_monitor",
                source=[left, right],
                reply_id=1000
            )

        # Define audioInput SynthDef
        @synthdef()
        def audioInput(inputBus=0, outputBus=0, amp=1.0, gate=1):
            # Capture from audio input device (using In.ar, not SoundIn which doesn't exist in supriya)
            # In SuperCollider, SoundIn.ar(bus) is equivalent to In.ar(NumOutputBuses.ir + bus)
            # For simplicity, we'll use In.ar directly on the input bus
            input_sig = In.ar(bus=inputBus, channel_count=2)
            input_sig = input_sig * amp

            # Envelope
            env = EnvGen.kr(
                envelope=Envelope.asr(attack_time=0.01, sustain=1, release_time=0.1),
                gate=gate,
                done_action=2  # Free synth when done
            )
            input_sig = input_sig * env

            # Output to bus
            Out.ar(bus=outputBus, source=input_sig)

        # Define sine SynthDef
        @synthdef()
        def sine(out=0, freq=440, amp=0.5, gate=1):
            # Envelope
            env = EnvGen.kr(
                envelope=Envelope.asr(attack_time=0.01, sustain=1, release_time=0.3),
                gate=gate,
                done_action=2
            )

            # Sine wave
            sig = SinOsc.ar(frequency=freq) * env * amp

            # Stereo output
            Out.ar(bus=out, source=[sig, sig])

        # Create OSC client to send to SuperCollider (same pattern as AudioEngineManager)
        osc_client = udp_client.SimpleUDPClient("127.0.0.1", 57110)

        # Compile each SynthDef to bytecode and send via /d_recv OSC command
        for synthdef_obj in [audioMonitor, audioInput, sine]:
            # Compile to SuperCollider bytecode
            bytecode = synthdef_obj.compile()

            # Send via OSC /d_recv command
            # /d_recv expects a blob (bytes) containing the compiled SynthDef
            osc_client.send_message("/d_recv", bytecode)

            logger.info(f"  ✅ Loaded {synthdef_obj.name} SynthDef ({len(bytecode)} bytes)")

        # Wait a moment for SuperCollider to process the SynthDefs
        await asyncio.sleep(0.1)

        logger.info("✅ Essential SynthDefs loaded")

    except Exception as e:
        logger.error(f"❌ Failed to load SynthDefs: {e}")
        import traceback
        logger.error(traceback.format_exc())
        # Don't raise - the app can still work without SynthDefs for now

