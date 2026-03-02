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

// Supersaw - JP-8000 style trance/EDM supersaw (7 detuned oscillators)
SynthDef(\supersaw, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3, detune=0.12, cutoff=5000|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sigs = Mix.fill(7, { |i|
        var offset = (i - 3) * detune * 0.01;
        Saw.ar(freq * (1 + offset))
    }) * (1/7);
    sigs = LPF.ar(sigs, cutoff);
    sigs = sigs * env * amp;
    Out.ar(out, [sigs, sigs]);
}).add;

// Acid Bass - TB-303 style squelchy resonant bass
SynthDef(\acidbass, { |out=0, freq=110, amp=0.5, gate=1, attack=0.001, release=0.15, cutoff=700, resonance=0.75, envMod=0.8|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var fenv = EnvGen.kr(Env.perc(0.001, 0.25, 1, -5)) * envMod;
    var sig = Saw.ar(freq);
    sig = RLPF.ar(sig, (cutoff * (1 + fenv * 4)).clip(80, 18000), resonance);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Reese Bass - Detuned saws, classic DnB/techno bass
SynthDef(\reese, { |out=0, freq=55, amp=0.5, gate=1, attack=0.01, release=0.4, detune=7, cutoff=650|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var d = detune * 0.001;
    var sig = Mix([
        Saw.ar(freq),
        Saw.ar(freq * (1 + d)),
        Saw.ar(freq * (1 - d)),
        Saw.ar(freq * 2) * 0.35
    ]) * 0.25;
    sig = LPF.ar(sig, cutoff);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Wobble Bass - LFO filter sweep bass
SynthDef(\wobble, { |out=0, freq=55, amp=0.5, gate=1, attack=0.01, release=0.4, lfoRate=4, cutoff=1400|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var lfo = SinOsc.kr(lfoRate, 0, 0.5, 0.5);
    var sig = Mix([Saw.ar(freq), Saw.ar(freq * 1.003)]) * 0.5;
    sig = RLPF.ar(sig, (cutoff * lfo * 5 + 120).clip(80, 18000), 0.25);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Stab Synth - Short punchy chord stab
SynthDef(\stab, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=0.12, cutoff=3500, detune=6|
    var env = EnvGen.kr(Env.perc(attack, release), doneAction: 2);
    var d = detune * 0.001;
    var sig = Mix([
        Saw.ar(freq),
        Saw.ar(freq * (1 + d)),
        Saw.ar(freq * (1 - d)),
        Pulse.ar(freq * 2, 0.3) * 0.25
    ]) * 0.25;
    sig = LPF.ar(sig, cutoff);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Glide Lead - Monophonic lead with portamento/glide
SynthDef(\glide, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3, cutoff=3200, resonance=0.3, glideTime=0.08|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var smoothFreq = Lag.kr(freq, glideTime);
    var sig = Saw.ar(smoothFreq);
    sig = RLPF.ar(sig, cutoff, resonance);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Chiptune - 8-bit pulse wave synth
SynthDef(\chiptune, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=0.1, width=0.25|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Mix([
        Pulse.ar(freq, width),
        Pulse.ar(freq * 2, width) * 0.3
    ]) * 0.6;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// String Ensemble - Lush detuned string pad
SynthDef(\strings, { |out=0, freq=440, amp=0.5, gate=1, attack=0.5, release=1.0, cutoff=4000, ensemble=0.3|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sigL = Mix.fill(6, { |i|
        var detune = (i - 2.5) * ensemble * 0.003;
        var lfo = SinOsc.kr(0.18 + (i * 0.04), i * 1.2, ensemble * 0.0015);
        Saw.ar(freq * (1 + detune + lfo))
    }) * (1/6);
    var sigR = Mix.fill(6, { |i|
        var detune = (i - 2.5) * ensemble * 0.003;
        var lfo = SinOsc.kr(0.18 + (i * 0.04), i * 2.4, ensemble * 0.0015);
        Saw.ar(freq * (1 + detune + lfo))
    }) * (1/6);
    sigL = LPF.ar(sigL, cutoff) * env * amp;
    sigR = LPF.ar(sigR, cutoff) * env * amp;
    Out.ar(out, [sigL, sigR]);
}).add;

// Brass Stab - Short, punchy brass-like attack
SynthDef(\brass, { |out=0, freq=440, amp=0.5, gate=1, attack=0.02, release=0.2, cutoff=2800, brightness=0.6|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var fenv = EnvGen.kr(Env.perc(0.02, 0.15, brightness, -4));
    var sig = Mix([Saw.ar(freq), Pulse.ar(freq, 0.4) * 0.5]) * 0.5;
    sig = RLPF.ar(sig, (cutoff * (1 + fenv * 1.5)).clip(200, 18000), 0.6);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Kalimba - Thumb piano / marimba-like tonal synth
SynthDef(\kalimba, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=1.8|
    var env = EnvGen.kr(Env.perc(attack, release, 1, -5), doneAction: 2);
    var sig = Mix([
        SinOsc.ar(freq),
        SinOsc.ar(freq * 4.0) * 0.3,
        SinOsc.ar(freq * 6.7) * 0.1
    ]) * 0.5;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Glass Harmonica - Ethereal glass-bowl sound
SynthDef(\glass, { |out=0, freq=440, amp=0.5, gate=1, attack=0.3, release=1.5|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var shimmer = SinOsc.kr(6, 0, 0.003, 1);
    var sig = Mix([
        SinOsc.ar(freq * shimmer),
        SinOsc.ar(freq * 2.756 * shimmer) * 0.4,
        SinOsc.ar(freq * 5.401 * shimmer) * 0.15
    ]) * 0.45;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

"✅ Instrument SynthDefs loaded".postln;
"   Basic: sine, saw, square".postln;
"   Advanced: fm, pad, bass, lead, pluck, bell, organ".postln;
"   Extended: supersaw, acidbass, reese, wobble, stab, glide, chiptune, strings, brass, kalimba, glass".postln;
)

