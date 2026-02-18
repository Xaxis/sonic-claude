/*
 * Instrument SynthDefs
 * 
 * Musical instrument synths for sequencer playback:
 * - Basic waveforms: sine, saw, square
 * - Advanced instruments: fm, pad, bass, lead, pluck, bell, organ
 */

(
// Basic Sine Wave
SynthDef(\sine, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.1|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = SinOsc.ar(freq) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Basic Sawtooth Wave
SynthDef(\saw, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.1|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Saw.ar(freq) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Basic Square Wave
SynthDef(\square, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.1|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Pulse.ar(freq, 0.5) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// FM Synth - Frequency modulation synthesis
SynthDef(\fm, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.1, modRatio=2, modIndex=1|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var modulator = SinOsc.ar(freq * modRatio) * (freq * modIndex);
    var carrier = SinOsc.ar(freq + modulator);
    var sig = carrier * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Pad Synth - Warm, lush pad sound
SynthDef(\pad, { |out=0, freq=440, amp=0.5, gate=1, attack=0.5, release=2.0, cutoff=2000|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Mix([
        Saw.ar(freq * 0.99),
        Saw.ar(freq),
        Saw.ar(freq * 1.01)
    ]) * 0.3;
    sig = LPF.ar(sig, cutoff);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Bass Synth - Deep, punchy bass
SynthDef(\bass, { |out=0, freq=110, amp=0.5, gate=1, attack=0.01, release=0.3, cutoff=800|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Mix([
        SinOsc.ar(freq),
        Saw.ar(freq) * 0.5
    ]);
    sig = LPF.ar(sig, cutoff);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Lead Synth - Bright, cutting lead sound
SynthDef(\lead, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.2, cutoff=4000, resonance=0.5|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Saw.ar(freq);
    sig = RLPF.ar(sig, cutoff, resonance);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Pluck Synth - Karplus-Strong plucked string
SynthDef(\pluck, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=1.0|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Pluck.ar(
        WhiteNoise.ar(0.1),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        10,
        coef: 0.5
    );
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Bell Synth - Metallic bell sound
SynthDef(\bell, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=2.0|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Mix([
        SinOsc.ar(freq),
        SinOsc.ar(freq * 2.76) * 0.5,
        SinOsc.ar(freq * 5.4) * 0.25,
        SinOsc.ar(freq * 8.93) * 0.125
    ]) * 0.3;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Organ Synth - Classic tonewheel organ sound
SynthDef(\organ, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.1, drawbar1=0.8, drawbar2=0.6, drawbar3=0.4|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Mix([
        SinOsc.ar(freq * 0.5) * drawbar1,
        SinOsc.ar(freq) * drawbar2,
        SinOsc.ar(freq * 2) * drawbar3,
        SinOsc.ar(freq * 3) * (drawbar3 * 0.5)
    ]) * 0.3;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

"✅ Instrument SynthDefs loaded".postln;
"   Basic: sine, saw, square".postln;
"   Advanced: fm, pad, bass, lead, pluck, bell, organ".postln;
)

