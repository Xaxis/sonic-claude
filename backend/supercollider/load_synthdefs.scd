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

// Define sample playback synth
SynthDef(\samplePlayer, { |out=0, bufnum, rate=1, amp=0.5, pan=0, startPos=0, loop=0, gate=1, attack=0.01, release=0.1|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = PlayBuf.ar(
        numChannels: 2,
        bufnum: bufnum,
        rate: rate * BufRateScale.kr(bufnum),
        trigger: 1,
        startPos: startPos * BufFrames.kr(bufnum),
        loop: loop,
        doneAction: if(loop == 0, 2, 0)  // Free synth when done (if not looping)
    );
    sig = sig * env * amp;
    sig = Balance2.ar(sig[0], sig[1], pan);
    Out.ar(out, sig);
}).add;

// ============================================================================
// PROFESSIONAL INSTRUMENT SYNTHDEFS
// ============================================================================

// FM Synth - Frequency Modulation synthesis
// Classic FM sound with carrier and modulator oscillators
SynthDef(\fm, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, decay=0.3, sustain=0.7, release=0.5, modRatio=2.0, modIndex=2.0|
    var env = EnvGen.kr(Env.adsr(attack, decay, sustain, release), gate, doneAction: 2);
    var modulator = SinOsc.ar(freq * modRatio) * freq * modIndex;
    var carrier = SinOsc.ar(freq + modulator);
    var sig = carrier * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Subtractive Synth - Classic analog-style subtractive synthesis
// Multiple oscillators with resonant low-pass filter
SynthDef(\subtractive, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, decay=0.3, sustain=0.7, release=0.5, cutoff=2000, resonance=0.5, filterEnv=0.5|
    var env = EnvGen.kr(Env.adsr(attack, decay, sustain, release), gate, doneAction: 2);
    var filterEnvelope = EnvGen.kr(Env.adsr(attack * 0.5, decay, sustain * 0.5, release * 0.5), gate);
    var sig = Mix([
        Saw.ar(freq) * 0.5,
        Pulse.ar(freq * 1.01, 0.5) * 0.3,
        SinOsc.ar(freq * 0.5) * 0.2  // Sub oscillator
    ]);
    var cutoffMod = cutoff + (cutoff * filterEnv * filterEnvelope);
    sig = RLPF.ar(sig, cutoffMod.clip(20, 20000), resonance.linlin(0, 1, 1, 0.1));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Pad Synth - Lush, detuned pad sound
// Multiple detuned oscillators for thick, evolving textures
SynthDef(\pad, { |out=0, freq=440, amp=0.3, gate=1, attack=0.5, decay=0.3, sustain=0.8, release=1.5, detune=0.08, cutoff=3000|
    var env = EnvGen.kr(Env.adsr(attack, decay, sustain, release), gate, doneAction: 2);
    var sig = Mix([
        Saw.ar(freq * (1 - detune)),
        Saw.ar(freq),
        Saw.ar(freq * (1 + detune)),
        Saw.ar(freq * (1 - (detune * 0.5))),
        Saw.ar(freq * (1 + (detune * 0.5))),
        Saw.ar(freq * 2) * 0.3  // Octave up for brightness
    ]) * 0.2;
    sig = LPF.ar(sig, cutoff);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Bass Synth - Deep, punchy bass sound
// Sub oscillator + filtered saw for classic bass tone
SynthDef(\bass, { |out=0, freq=220, amp=0.6, gate=1, attack=0.01, decay=0.2, sustain=0.5, release=0.3, cutoff=800, resonance=0.3, drive=1.0|
    var env = EnvGen.kr(Env.adsr(attack, decay, sustain, release), gate, doneAction: 2);
    var sub = SinOsc.ar(freq * 0.5) * 0.6;
    var main = Saw.ar(freq) * 0.4;
    var sig = (sub + main) * drive;
    sig = RLPF.ar(sig, cutoff, resonance.linlin(0, 1, 1, 0.1));
    sig = sig.tanh;  // Soft clipping for warmth
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Lead Synth - Bright, cutting lead sound
// Detuned saws with resonant filter for cutting through the mix
SynthDef(\lead, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, decay=0.1, sustain=0.7, release=0.2, cutoff=4000, resonance=0.4, detune=0.02|
    var env = EnvGen.kr(Env.adsr(attack, decay, sustain, release), gate, doneAction: 2);
    var filterEnv = EnvGen.kr(Env.adsr(attack, decay * 0.5, sustain * 0.3, release));
    var sig = Mix([
        Saw.ar(freq * (1 - detune)),
        Saw.ar(freq * (1 + detune))
    ]) * 0.5;
    var cutoffMod = cutoff + (cutoff * 2 * filterEnv);
    sig = RLPF.ar(sig, cutoffMod.clip(20, 20000), resonance.linlin(0, 1, 1, 0.1));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Pluck Synth - Karplus-Strong plucked string synthesis
// Physical modeling of plucked strings
SynthDef(\pluck, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=2.0, coef=0.5|
    var env = EnvGen.kr(Env.perc(attack, release), gate, doneAction: 2);
    var sig = Pluck.ar(
        in: WhiteNoise.ar(0.1),
        trig: gate,
        maxdelaytime: 0.1,
        delaytime: freq.reciprocal,
        decaytime: release,
        coef: coef
    );
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Bell Synth - Metallic bell/mallet sound
// FM-based bell tone with inharmonic partials
SynthDef(\bell, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=3.0, brightness=1.0|
    var env = EnvGen.kr(Env.perc(attack, release, curve: -4), gate, doneAction: 2);
    var sig = Mix([
        SinOsc.ar(freq) * 0.5,
        SinOsc.ar(freq * 2.76) * 0.3,
        SinOsc.ar(freq * 5.4) * 0.15,
        SinOsc.ar(freq * 8.93) * 0.05
    ]) * brightness;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Organ Synth - Classic tonewheel organ sound
// Multiple harmonics (drawbars) for organ tone
SynthDef(\organ, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.1, drawbar1=0.8, drawbar2=0.6, drawbar3=0.4|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Mix([
        SinOsc.ar(freq * 0.5) * drawbar1,      // Sub octave
        SinOsc.ar(freq) * drawbar2,             // Fundamental
        SinOsc.ar(freq * 2) * drawbar3,         // Octave up
        SinOsc.ar(freq * 3) * (drawbar3 * 0.5) // Fifth
    ]) * 0.3;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

"✅ SynthDefs loaded successfully:".postln;
"".postln;
"   MONITORING:".postln;
"   - audioMonitor: Buffer-based monitoring (chunk: %, partitions: %)".format(chunkSize, numChunks).postln;
"".postln;
"   BASIC SYNTHS:".postln;
"   - sine: Simple sine wave synth".postln;
"   - saw: Saw wave synth with filter".postln;
"   - square: Square wave synth with pulse width".postln;
"".postln;
"   PROFESSIONAL INSTRUMENTS:".postln;
"   - fm: Frequency modulation synth (modRatio, modIndex)".postln;
"   - subtractive: Analog-style synth (cutoff, resonance, filterEnv)".postln;
"   - pad: Lush detuned pad (detune, cutoff)".postln;
"   - bass: Deep bass synth (cutoff, resonance, drive)".postln;
"   - lead: Bright lead synth (cutoff, resonance, detune)".postln;
"   - pluck: Karplus-Strong plucked string (coef)".postln;
"   - bell: Metallic bell/mallet (brightness)".postln;
"   - organ: Tonewheel organ (drawbar1, drawbar2, drawbar3)".postln;
"".postln;
"   PLAYBACK:".postln;
"   - samplePlayer: Audio sample playback with loop and envelope".postln;
"".postln;
"BUFFER_IDS: waveform=%, spectrum=%".format(~waveformBuffer.bufnum, ~spectrumBuffer.bufnum).postln;

// Exit immediately
0.exit;
)

