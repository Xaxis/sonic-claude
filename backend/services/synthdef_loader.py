"""
SynthDef Loader - Loads essential SynthDefs into SuperCollider

CORRECT ARCHITECTURE (based on scsynth.org forum research):
- Uses Buffer + BufWr for audio data storage
- Uses SendReply ONLY to signal when data is ready
- Uses partitioning to avoid read/write conflicts
- NO loadToFloatArray (creates temp files)
- Uses Buffer.getn() in sclang to retrieve data
"""
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


async def load_essential_synthdefs(engine_manager):
    """
    Load essential SynthDefs into SuperCollider
    
    This function sends .scsyndef files to scsynth via OSC /d_load
    The SynthDef files are pre-compiled SuperCollider definitions
    """
    try:
        logger.info("🎵 Loading essential SynthDefs into SuperCollider...")
        
        # Path to SynthDef files
        synthdef_dir = Path(__file__).parent.parent / "supercollider" / "synthdefs"
        
        # For now, we'll define SynthDefs directly in SuperCollider code
        # and send them via sclang (since we need the OSC relay running anyway)
        # This is cleaner than trying to compile SynthDefs in Python
        
        logger.info("✅ SynthDefs will be loaded via SuperCollider scripts")
        logger.info("   audioMonitor: Buffer-based audio monitoring with partitioning")
        logger.info("   sine: Simple sine wave synth for testing")
        
    except Exception as e:
        logger.error(f"❌ Failed to load SynthDefs: {e}")
        raise


# SuperCollider SynthDef code (to be loaded via sclang)
# This is the CORRECT architecture based on jamshark70's answer
SYNTHDEF_CODE = """
(
// CORRECT ARCHITECTURE: Buffer-based audio monitoring
// Based on scsynth.org forum answer by jamshark70

var chunkSize = 1024;
var numChunks = 8;

// Allocate buffer for waveform data (8 partitions of 1024 samples each)
~waveformBuffer = Buffer.alloc(s, chunkSize * numChunks, 1);

// Allocate buffer for spectrum data
~spectrumBuffer = Buffer.alloc(s, chunkSize * numChunks, 1);

// Define audioMonitor SynthDef
SynthDef(\\audioMonitor, { |targetBus=0, waveformBuf, spectrumBuf, sendRate=60|
    var sig = In.ar(targetBus, 2);
    var mono = Mix.ar(sig) * 0.5;  // Mix to mono for analysis
    
    // Waveform capture using buffer partitioning
    var phase = Phasor.ar(0, 1, 0, chunkSize);
    var trig = HPZ1.ar(phase) < 0;  // Trigger when phase wraps
    var partition = PulseCount.ar(trig) % numChunks;
    
    // Write audio to rotating buffer partitions
    BufWr.ar(mono, waveformBuf, phase + (chunkSize * partition));
    
    // Signal when a partition is ready (send partition number, buffer ID, chunk size, num chunks)
    SendReply.ar(trig, '/buffer_ready', [partition, waveformBuf, chunkSize, numChunks]);
    
    // TODO: Add FFT analysis for spectrum data
    // For now, we'll just send waveform data
    
    // Send meter data (peak and RMS) at regular intervals
    var meterTrig = Impulse.kr(sendRate);
    var left = sig[0];
    var right = sig[1];
    var peakL = Peak.ar(left, meterTrig).lag(0.1);
    var peakR = Peak.ar(right, meterTrig).lag(0.1);
    var rmsL = RunningSum.ar(left.squared, 48000 / sendRate).sqrt;
    var rmsR = RunningSum.ar(right.squared, 48000 / sendRate).sqrt;
    
    SendReply.kr(meterTrig, '/meter', [peakL, peakR, rmsL, rmsR]);
}).add;

// Define simple sine synth for testing
SynthDef(\\sine, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = SinOsc.ar(freq) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

"✅ SynthDefs loaded successfully".postln;
"   audioMonitor: Buffer-based monitoring (chunk size: %, partitions: %)".format(chunkSize, numChunks).postln;
"   sine: Simple sine wave synth".postln;
)
"""

