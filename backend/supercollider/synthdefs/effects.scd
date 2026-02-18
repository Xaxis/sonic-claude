/*
 * Effects SynthDefs
 * 
 * Professional audio effects for insert chains and send/return buses.
 * All effects are designed to process stereo audio in-place on a bus.
 * 
 * Architecture:
 * - Read from inBus (stereo)
 * - Process audio
 * - Write to outBus (stereo)
 * - Can be chained: synth1 → effect1 → effect2 → mixer
 */

(
// ============================================================================
// FILTERS
// ============================================================================

// Low-Pass Filter - Removes high frequencies
SynthDef(\lpf, { |inBus=10, outBus=10, cutoff=2000, resonance=0.5, bypass=0|
    var sig, filtered;
    sig = In.ar(inBus, 2);
    filtered = RLPF.ar(sig, cutoff.clip(20, 20000), resonance.clip(0.1, 1.0));
    sig = Select.ar(bypass, [filtered, sig]); // bypass: 0=active, 1=bypassed
    ReplaceOut.ar(outBus, sig);
}).add;

// High-Pass Filter - Removes low frequencies
SynthDef(\hpf, { |inBus=10, outBus=10, cutoff=100, resonance=0.5, bypass=0|
    var sig, filtered;
    sig = In.ar(inBus, 2);
    filtered = RHPF.ar(sig, cutoff.clip(20, 20000), resonance.clip(0.1, 1.0));
    sig = Select.ar(bypass, [filtered, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// Band-Pass Filter - Isolates a frequency range
SynthDef(\bpf, { |inBus=10, outBus=10, freq=1000, bandwidth=0.5, bypass=0|
    var sig, filtered;
    sig = In.ar(inBus, 2);
    filtered = BPF.ar(sig, freq.clip(20, 20000), bandwidth.clip(0.1, 2.0));
    sig = Select.ar(bypass, [filtered, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// ============================================================================
// EQ
// ============================================================================

// Parametric EQ (3-band) - Professional EQ with low/mid/high bands
SynthDef(\eq3, { |inBus=10, outBus=10, 
    lowGain=0, lowFreq=100,
    midGain=0, midFreq=1000, midQ=1.0,
    highGain=0, highFreq=8000,
    bypass=0|
    var sig, eq;
    sig = In.ar(inBus, 2);
    
    // Low shelf
    eq = BLowShelf.ar(sig, lowFreq.clip(20, 500), 1.0, lowGain.clip(-24, 24));
    // Mid peak
    eq = BPeakEQ.ar(eq, midFreq.clip(200, 8000), midQ.clip(0.5, 4.0), midGain.clip(-24, 24));
    // High shelf
    eq = BHiShelf.ar(eq, highFreq.clip(2000, 20000), 1.0, highGain.clip(-24, 24));
    
    sig = Select.ar(bypass, [eq, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// ============================================================================
// DYNAMICS
// ============================================================================

// Compressor - Reduces dynamic range
SynthDef(\compressor, { |inBus=10, outBus=10, 
    threshold=(-12), ratio=4, attack=0.01, release=0.1, 
    makeupGain=0, bypass=0|
    var sig, compressed;
    sig = In.ar(inBus, 2);
    
    compressed = Compander.ar(
        sig,
        sig,
        threshold.dbamp,
        1.0,           // Below threshold: 1:1 (no compression)
        1.0/ratio,     // Above threshold: ratio:1
        attack,
        release
    );
    
    // Apply makeup gain
    compressed = compressed * makeupGain.dbamp;
    
    sig = Select.ar(bypass, [compressed, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// Limiter - Prevents signal from exceeding threshold
SynthDef(\limiter, { |inBus=10, outBus=10, threshold=(-1), release=0.01, bypass=0|
    var sig, limited;
    sig = In.ar(inBus, 2);
    
    limited = Limiter.ar(sig, threshold.dbamp, release);
    
    sig = Select.ar(bypass, [limited, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// Gate - Silences signal below threshold
SynthDef(\gate, { |inBus=10, outBus=10, threshold=(-40), attack=0.01, release=0.1, bypass=0|
    var sig, gated;
    sig = In.ar(inBus, 2);
    
    gated = Compander.ar(
        sig,
        sig,
        threshold.dbamp,
        10.0,          // Below threshold: expand (gate)
        1.0,           // Above threshold: 1:1 (pass through)
        attack,
        release
    );
    
    sig = Select.ar(bypass, [gated, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// ============================================================================
// DISTORTION
// ============================================================================

// Distortion - Adds harmonic saturation
SynthDef(\distortion, { |inBus=10, outBus=10, drive=1.0, tone=0.5, mix=1.0, bypass=0|
    var sig, dist, filtered;
    sig = In.ar(inBus, 2);
    
    // Soft clipping distortion
    dist = (sig * drive.clip(1, 20)).tanh;
    
    // Tone control (low-pass filter)
    filtered = LPF.ar(dist, tone.linexp(0, 1, 500, 10000));
    
    // Mix wet/dry
    dist = (filtered * mix) + (sig * (1 - mix));
    
    sig = Select.ar(bypass, [dist, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// ============================================================================
// TIME-BASED EFFECTS
// ============================================================================

// Reverb - Algorithmic reverb
SynthDef(\reverb, { |inBus=10, outBus=10, roomSize=0.5, damping=0.5, mix=0.3, bypass=0|
    var sig, verb, verbSig;
    sig = In.ar(inBus, 2);

    // FreeVerb - classic algorithmic reverb
    verbSig = FreeVerb2.ar(
        sig[0], sig[1],
        mix.clip(0, 1),
        roomSize.clip(0, 1),
        damping.clip(0, 1)
    );

    sig = Select.ar(bypass, [verbSig, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// Delay - Stereo delay with feedback
SynthDef(\delay, { |inBus=10, outBus=10, delayTime=0.25, feedback=0.5, mix=0.3, bypass=0|
    var sig, delayed, delaySig;
    sig = In.ar(inBus, 2);

    // Stereo delay with feedback
    delayed = LocalIn.ar(2);
    delayed = DelayC.ar(sig + (delayed * feedback.clip(0, 0.95)), 2.0, delayTime.clip(0.001, 2.0));
    LocalOut.ar(delayed);

    // Mix wet/dry
    delaySig = (delayed * mix) + (sig * (1 - mix));

    sig = Select.ar(bypass, [delaySig, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// Chorus - Modulated delay for thickening
SynthDef(\chorus, { |inBus=10, outBus=10, rate=0.5, depth=0.02, mix=0.5, bypass=0|
    var sig, modulated, chorusSig;
    sig = In.ar(inBus, 2);

    // LFO for modulation
    modulated = DelayC.ar(
        sig,
        0.1,
        SinOsc.kr(rate.clip(0.1, 10), [0, 0.5pi]).range(0.005, depth.clip(0.005, 0.05))
    );

    // Mix wet/dry
    chorusSig = (modulated * mix) + (sig * (1 - mix));

    sig = Select.ar(bypass, [chorusSig, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// Flanger - Short modulated delay for sweeping effect
SynthDef(\flanger, { |inBus=10, outBus=10, rate=0.2, depth=0.005, feedback=0.5, mix=0.5, bypass=0|
    var sig, flanged, flangeSig, delayed;
    sig = In.ar(inBus, 2);

    // Very short delay with LFO modulation and feedback
    delayed = LocalIn.ar(2);
    flanged = DelayC.ar(
        sig + (delayed * feedback.clip(0, 0.9)),
        0.02,
        SinOsc.kr(rate.clip(0.05, 5), [0, 0.5pi]).range(0.001, depth.clip(0.001, 0.01))
    );
    LocalOut.ar(flanged);

    // Mix wet/dry
    flangeSig = (flanged * mix) + (sig * (1 - mix));

    sig = Select.ar(bypass, [flangeSig, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// Phaser - All-pass filter modulation
SynthDef(\phaser, { |inBus=10, outBus=10, rate=0.3, depth=0.5, stages=4, mix=0.5, bypass=0|
    var sig, phased, phaseSig, modFreq;
    sig = In.ar(inBus, 2);

    // LFO modulates all-pass filter frequency
    modFreq = SinOsc.kr(rate.clip(0.05, 5)).range(200, 2000 * depth.clip(0.1, 1.0));

    // Chain of all-pass filters
    phased = sig;
    stages.clip(1, 8).asInteger.do({
        phased = AllpassC.ar(phased, 0.02, modFreq.reciprocal, 0.1);
    });

    // Mix wet/dry
    phaseSig = (phased * mix) + (sig * (1 - mix));

    sig = Select.ar(bypass, [phaseSig, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// ============================================================================
// UTILITY
// ============================================================================

// Gain - Simple volume adjustment
SynthDef(\gain, { |inBus=10, outBus=10, gain=0, bypass=0|
    var sig, gained;
    sig = In.ar(inBus, 2);
    gained = sig * gain.dbamp;
    sig = Select.ar(bypass, [gained, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

// Stereo Width - Adjust stereo image
SynthDef(\stereoWidth, { |inBus=10, outBus=10, width=1.0, bypass=0|
    var sig, mid, side, widened;
    sig = In.ar(inBus, 2);

    // Mid-side processing
    mid = (sig[0] + sig[1]) * 0.5;
    side = (sig[0] - sig[1]) * 0.5 * width.clip(0, 2);

    // Convert back to stereo
    widened = [mid + side, mid - side];

    sig = Select.ar(bypass, [widened, sig]);
    ReplaceOut.ar(outBus, sig);
}).add;

"".postln;
"✅✅✅ ALL EFFECTS SYNTHDEFS LOADED! ✅✅✅".postln;
"".postln;
"═══════════════════════════════════════════════════════════════".postln;
"   FILTERS (3): lpf, hpf, bpf".postln;
"   EQ (1): eq3 (3-band parametric)".postln;
"   DYNAMICS (3): compressor, limiter, gate".postln;
"   DISTORTION (1): distortion".postln;
"   TIME-BASED (5): reverb, delay, chorus, flanger, phaser".postln;
"   UTILITY (2): gain, stereoWidth".postln;
"═══════════════════════════════════════════════════════════════".postln;
"   TOTAL: 15 professional audio effects".postln;
"═══════════════════════════════════════════════════════════════".postln;
"".postln;
)

