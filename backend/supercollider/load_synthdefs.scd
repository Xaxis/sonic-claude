/*
 * Load SynthDefs for Sonic Claude
 *
 * CORRECT ARCHITECTURE (based on scsynth.org forum research):
 * - Uses Buffer + BufWr for audio data storage
 * - Uses SendReply ONLY to signal when data is ready
 * - Uses partitioning to avoid read/write conflicts
 */

(
// Configuration
var chunkSize = 1024;
var numChunks = 8;

"🎵 Loading SynthDefs for Sonic Claude...".postln;

// Allocate buffers for audio monitoring
~waveformBuffer = Buffer.alloc(s, chunkSize * numChunks, 1);
~spectrumBuffer = Buffer.alloc(s, chunkSize * numChunks, 1);

"✅ Allocated buffers:".postln;
"   Waveform buffer: % (ID: %)".format(chunkSize * numChunks, ~waveformBuffer.bufnum).postln;
"   Spectrum buffer: % (ID: %)".format(chunkSize * numChunks, ~spectrumBuffer.bufnum).postln;

// Define audioMonitor SynthDef
SynthDef(\audioMonitor, { |targetBus=0, waveformBuf, spectrumBuf, sendRate=60|
    var sig = In.ar(targetBus, 2);
    var mono = Mix.ar(sig) * 0.5;  // Mix to mono for analysis
    
    // Waveform capture using buffer partitioning
    var phase = Phasor.ar(0, 1, 0, chunkSize);
    var trig = HPZ1.ar(phase) < 0;  // Trigger when phase wraps
    var partition = PulseCount.ar(trig) % numChunks;
    
    // Write audio to rotating buffer partitions
    BufWr.ar(mono, waveformBuf, phase + (chunkSize * partition));
    
    // Signal when a partition is ready
    SendReply.ar(trig, '/buffer_ready', [partition, waveformBuf, chunkSize, numChunks]);
    
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
SynthDef(\sine, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = SinOsc.ar(freq) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Define saw synth
SynthDef(\saw, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3, cutoff=2000|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Saw.ar(freq) * env * amp;
    sig = LPF.ar(sig, cutoff);
    Out.ar(out, [sig, sig]);
}).add;

// Define square synth
SynthDef(\square, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3, width=0.5|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Pulse.ar(freq, width) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

"✅ SynthDefs loaded successfully:".postln;
"   audioMonitor: Buffer-based monitoring (chunk: %, partitions: %)".format(chunkSize, numChunks).postln;
"   sine: Simple sine wave synth".postln;
"   saw: Saw wave synth with filter".postln;
"   square: Square wave synth with pulse width".postln;
"".postln;
"BUFFER_IDS: waveform=%, spectrum=%".format(~waveformBuffer.bufnum, ~spectrumBuffer.bufnum).postln;

// Exit immediately
0.exit;
)

