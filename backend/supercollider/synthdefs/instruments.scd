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

// ─── Basic Waveforms (continued) ──────────────────────────────────────────────

// Triangle Wave - Band-limited triangle oscillator
SynthDef(\triangle, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.1|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = LFTri.ar(freq) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ─── Synth Category ───────────────────────────────────────────────────────────

// Duo - Dual detuned oscillators
SynthDef(\duo, { |out=0, freq=440, amp=0.5, gate=1, attack=0.02, release=0.3, detune=5, cutoff=4000|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var d   = detune * 0.001;
    var sig = Mix([Saw.ar(freq * (1 + d)), Saw.ar(freq * (1 - d))]) * 0.5;
    sig = LPF.ar(sig, cutoff.clip(40, 18000));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// PWM - Pulse width modulation with LFO width sweep
SynthDef(\pwm, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3, lfoRate=0.5, cutoff=3000|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var lfo = SinOsc.kr(lfoRate, 0, 0.35, 0.5);
    var sig = Pulse.ar(freq, lfo);
    sig = LPF.ar(sig, cutoff.clip(40, 18000));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Hoover - Classic rave hoover synth with glide
SynthDef(\hoover, { |out=0, freq=440, amp=0.5, gate=1, attack=0.04, release=0.5, detune=0.15, cutoff=4500, glideTime=0.06|
    var env       = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var smoothFreq = Lag.kr(freq, glideTime);
    var sigs = Mix.fill(5, { |i|
        var offset = (i - 2) * detune * 0.01;
        Saw.ar(smoothFreq * (1 + offset))
    }) * 0.2;
    sigs = LPF.ar(sigs, cutoff.clip(40, 18000));
    sigs = sigs * env * amp;
    Out.ar(out, [sigs, sigs]);
}).add;

// PolyBrass - Polysynth brass with filter envelope
SynthDef(\polyBrass, { |out=0, freq=440, amp=0.5, gate=1, attack=0.04, release=0.25, cutoff=2000, brightness=0.7|
    var env  = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var fenv = EnvGen.kr(Env.perc(0.04, 0.2, brightness, -3));
    var sig  = Mix([
        Saw.ar(freq),
        Saw.ar(freq * 0.998),
        Saw.ar(freq * 2) * 0.4,
        Pulse.ar(freq, 0.4) * 0.3
    ]) * 0.25;
    sig = RLPF.ar(sig, (cutoff * (1 + fenv * 2)).clip(200, 18000), 0.5);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// FM Bell - Yamaha DX-style percussive FM bell
SynthDef(\fmBell, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=3.0, modRatio=3.5, modIndex=6|
    var env    = EnvGen.kr(Env.perc(attack, release, 1, -4), doneAction: 2);
    var modEnv = EnvGen.kr(Env.perc(0.001, release * 0.7, modIndex, -4));
    var mod    = SinOsc.ar(freq * modRatio) * (freq * modEnv);
    var sig    = SinOsc.ar(freq + mod) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// FM Vibes - FM vibraphone with vibrato
SynthDef(\fmVibes, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=2.5, modRatio=2.0, vibRate=5.2|
    var env = EnvGen.kr(Env.perc(attack, release, 1, -3), doneAction: 2);
    var vib = SinOsc.kr(vibRate, 0, 0.008, 1);
    var mod = SinOsc.ar(freq * modRatio) * (freq * 2.5);
    var sig = Mix([SinOsc.ar(freq * vib + mod), SinOsc.ar(freq * 2 * vib) * 0.3]) * 0.55;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Bowed String - Physical model of bowed string via resonant delay
SynthDef(\bowedStr, { |out=0, freq=440, amp=0.5, gate=1, attack=0.3, release=0.5, bowPressure=0.5, cutoff=4000|
    var env   = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var noise = WhiteNoise.ar(bowPressure * 0.3);
    var sig   = CombL.ar(noise, 1/40, freq.reciprocal.clip(1/20000, 1/40), 0.5);
    sig = LPF.ar(sig, cutoff.clip(40, 18000));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Metal Klank - Metallic resonant bank
SynthDef(\metalKlank, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=2.0|
    var env    = EnvGen.kr(Env.perc(attack, release, 1, -4), doneAction: 2);
    var excite = Impulse.ar(0);
    var sig    = Klank.ar(`[[1, 2.1, 3.15, 4.4, 6.0], [1.0, 0.6, 0.4, 0.25, 0.15], [1.5, 1.0, 0.7, 0.5, 0.3]], excite, freq);
    sig = sig * env * amp * 0.3;
    Out.ar(out, [sig, sig]);
}).add;

// Nylon String - Karplus-Strong nylon guitar
SynthDef(\nylonStr, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=1.5|
    var env = EnvGen.kr(Env.perc(attack, release, 1, -3), doneAction: 2);
    var sig = Pluck.ar(PinkNoise.ar(0.15), Impulse.kr(0), freq.reciprocal, freq.reciprocal, 8, coef: 0.3);
    sig = LPF.ar(sig, 5000);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ─── Bass Category ────────────────────────────────────────────────────────────

// FM Bass - FM synthesis bass with decaying modulator
SynthDef(\fmBass, { |out=0, freq=110, amp=0.5, gate=1, attack=0.005, release=0.3, modRatio=0.5, modIndex=3|
    var env    = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var modEnv = EnvGen.kr(Env.perc(0.001, 0.15, modIndex, -5));
    var mod    = SinOsc.ar(freq * modRatio) * (freq * modEnv);
    var sig    = SinOsc.ar(freq + mod) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Moog Bass - Cascaded RLPF simulating 4-pole ladder filter
SynthDef(\moogBass, { |out=0, freq=110, amp=0.5, gate=1, attack=0.005, release=0.4, cutoff=600, resonance=0.6|
    var env  = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var fenv = EnvGen.kr(Env.perc(0.001, 0.2, 1, -6));
    var sig  = Mix([Saw.ar(freq), Saw.ar(freq * 1.003)]) * 0.5;
    var fcut = (cutoff * (1 + fenv * 3)).clip(40, 18000);
    sig = RLPF.ar(RLPF.ar(sig, fcut, resonance.clip(0.01, 0.99)), fcut, resonance.clip(0.01, 0.99));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Dark Bass - Sub bass with slight saturation
SynthDef(\darkBass, { |out=0, freq=55, amp=0.5, gate=1, attack=0.01, release=0.5, cutoff=400, detune=4|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var d   = detune * 0.001;
    var sig = Mix([
        SinOsc.ar(freq) * 0.6,
        Saw.ar(freq * (1 + d)) * 0.25,
        Saw.ar(freq * (1 - d)) * 0.25
    ]);
    sig = LPF.ar(sig, cutoff.clip(40, 8000));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Punch Bass - Hard attack with fast filter sweep
SynthDef(\punchBass, { |out=0, freq=110, amp=0.5, gate=1, attack=0.001, release=0.35, cutoff=1200|
    var env  = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var fenv = EnvGen.kr(Env.perc(0.001, 0.08, 1, -8));
    var sig  = Mix([Saw.ar(freq), SinOsc.ar(freq) * 0.5]) * 0.6;
    sig = RLPF.ar(sig, (cutoff + (fenv * cutoff * 6)).clip(40, 18000), 0.5);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Dub Bass - Reggae/dub sine-dominant bass
SynthDef(\dubBass, { |out=0, freq=55, amp=0.5, gate=1, attack=0.01, release=0.8, cutoff=500|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Mix([SinOsc.ar(freq) * 0.7, SinOsc.ar(freq * 2) * 0.2, Saw.ar(freq) * 0.1]);
    sig = LPF.ar(sig, cutoff.clip(40, 4000));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Sub Bass - Pure sine sub with optional soft drive
SynthDef(\subBass, { |out=0, freq=55, amp=0.5, gate=1, attack=0.01, release=0.3, drive=0.0|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = SinOsc.ar(freq);
    sig = sig + (sig.distort * drive * 0.2);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Square Bass - Square wave bass with filter
SynthDef(\squareBass, { |out=0, freq=110, amp=0.5, gate=1, attack=0.005, release=0.3, cutoff=1500, width=0.5|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Pulse.ar(freq, width);
    sig = LPF.ar(sig, cutoff.clip(40, 18000));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ─── Lead Category ────────────────────────────────────────────────────────────

// Analog Lead - Classic detuned mono lead
SynthDef(\analogLead, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.2, cutoff=4000, resonance=0.4, detune=3|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var d   = detune * 0.001;
    var sig = Mix([
        Saw.ar(freq * (1 + d)),
        Saw.ar(freq * (1 - d)),
        Pulse.ar(freq, 0.45) * 0.5
    ]) * 0.35;
    sig = RLPF.ar(sig, cutoff.clip(40, 18000), resonance.clip(0.01, 0.99));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Square Lead - Square wave lead
SynthDef(\squareLead, { |out=0, freq=440, amp=0.5, gate=1, attack=0.005, release=0.2, cutoff=5000, width=0.5|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Mix([Pulse.ar(freq, width), Pulse.ar(freq * 2, width) * 0.2]) * 0.6;
    sig = LPF.ar(sig, cutoff.clip(40, 18000));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// FM Lead - FM synthesis lead
SynthDef(\fmLead, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.25, modRatio=1.5, modIndex=2|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var mod = SinOsc.ar(freq * modRatio) * (freq * modIndex);
    var sig = SinOsc.ar(freq + mod) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Buzz Lead - Rich harmonic lead using Blip oscillator
SynthDef(\buzzLead, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.2, cutoff=5000, harmonics=8|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Blip.ar(freq, harmonics.clip(1, 50));
    sig = LPF.ar(sig, cutoff.clip(40, 18000));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ─── Pad Category ─────────────────────────────────────────────────────────────

// Warm Pad - Slow-attack detuned saw pad
SynthDef(\warmPad, { |out=0, freq=440, amp=0.5, gate=1, attack=0.8, release=2.5, cutoff=1800, detune=0.15|
    var env  = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sigs = Mix.fill(4, { |i|
        var offset = (i - 1.5) * detune * 0.007;
        Saw.ar(freq * (1 + offset))
    }) * 0.25;
    sigs = LPF.ar(sigs, cutoff.clip(40, 18000));
    sigs = sigs * env * amp;
    Out.ar(out, [sigs, sigs]);
}).add;

// Juno Pad - Juno-106 style stereo chorus pad
SynthDef(\junoPad, { |out=0, freq=440, amp=0.5, gate=1, attack=0.15, release=1.5, cutoff=2500, chorusDepth=0.003|
    var env  = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var lfoL = SinOsc.kr(0.5,  0,   chorusDepth, 1);
    var lfoR = SinOsc.kr(0.5,  pi,  chorusDepth, 1);
    var sigL = Saw.ar(freq * lfoL) + (Pulse.ar(freq * lfoL, 0.5) * 0.3);
    var sigR = Saw.ar(freq * lfoR) + (Pulse.ar(freq * lfoR, 0.5) * 0.3);
    sigL = LPF.ar(sigL, cutoff.clip(40, 18000)) * env * amp * 0.5;
    sigR = LPF.ar(sigR, cutoff.clip(40, 18000)) * env * amp * 0.5;
    Out.ar(out, [sigL, sigR]);
}).add;

// Choir Pad - Vowel formant filter pad
SynthDef(\choirPad, { |out=0, freq=440, amp=0.5, gate=1, attack=0.6, release=2.0, cutoff=3000, vowel=0.5|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Mix([Saw.ar(freq * 0.998), Saw.ar(freq * 1.001), Saw.ar(freq * 2.001) * 0.3]) * 0.35;
    var f1  = ((800 * (1 - vowel)) + (270 * vowel)).clip(40, 8000);
    var f2  = ((1200 * (1 - vowel)) + (2300 * vowel)).clip(40, 10000);
    sig = BPF.ar(sig, f1, 0.2, 0.7) + BPF.ar(sig, f2, 0.15, 0.5) + (sig * 0.3);
    sig = LPF.ar(sig, cutoff.clip(40, 18000));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Space Pad - Ambient shimmer pad with LFO drift
SynthDef(\spacePad, { |out=0, freq=440, amp=0.5, gate=1, attack=1.5, release=3.5, cutoff=3000, shimmer=0.5|
    var env  = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var lfo1 = SinOsc.kr(0.13, 0,   shimmer * 0.008, 1);
    var lfo2 = SinOsc.kr(0.19, 2.1, shimmer * 0.006, 1);
    var sigL = Mix([SinOsc.ar(freq * lfo1), SinOsc.ar(freq * 2 * lfo2) * 0.4, Saw.ar(freq * lfo1) * 0.2]) * 0.45;
    var sigR = Mix([SinOsc.ar(freq * lfo2), SinOsc.ar(freq * 2 * lfo1) * 0.4, Saw.ar(freq * lfo2) * 0.2]) * 0.45;
    sigL = LPF.ar(sigL, cutoff.clip(40, 18000)) * env * amp;
    sigR = LPF.ar(sigR, cutoff.clip(40, 18000)) * env * amp;
    Out.ar(out, [sigL, sigR]);
}).add;

// Dream Pad - Harmonic series pad with per-voice drift
SynthDef(\dreamPad, { |out=0, freq=440, amp=0.5, gate=1, attack=1.0, release=3.0, cutoff=2500, drift=0.4|
    var env  = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sigs = Mix.fill(6, { |i|
        var lfo = SinOsc.kr(Rand(0.05, 0.3), i * 1.05, drift * 0.004, 1);
        SinOsc.ar(freq * (i + 1) * lfo) * (1 / (i + 1).sqrt)
    }) * 0.25;
    sigs = LPF.ar(sigs, cutoff.clip(40, 18000));
    sigs = sigs * env * amp;
    Out.ar(out, [sigs, sigs]);
}).add;

// Atmosphere Pad - Dark textural pad with noise layer
SynthDef(\atmospherePad, { |out=0, freq=440, amp=0.5, gate=1, attack=1.2, release=4.0, cutoff=1200|
    var env   = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var noise = LPF.ar(BrownNoise.ar(0.15), 500);
    var tones = Mix([SinOsc.ar(freq * 0.998), SinOsc.ar(freq * 1.002), SinOsc.ar(freq * 2.001) * 0.3]) * 0.45;
    var sig   = (tones + noise) * 0.6;
    sig = LPF.ar(sig, cutoff.clip(40, 8000));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Lo-fi Pad - Filtered vintage pad with optional bit reduction
SynthDef(\loPad, { |out=0, freq=440, amp=0.5, gate=1, attack=0.4, release=2.0, cutoff=1000, bitCrush=0|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = Mix([Saw.ar(freq * 0.997), Saw.ar(freq * 1.003), SinOsc.ar(freq * 2) * 0.2]) * 0.4;
    sig = LPF.ar(sig, cutoff.clip(40, 8000));
    sig = sig.round(0.01 + (bitCrush * 0.1));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ─── Keys Category ────────────────────────────────────────────────────────────

// Rhodes - FM electric piano (Rhodes-style)
SynthDef(\rhodes, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=2.0, tone=0.5|
    var env    = EnvGen.kr(Env.perc(attack, release, 1, -4), doneAction: 2);
    var modEnv = EnvGen.kr(Env.perc(0.001, release * 0.3, freq * tone * 3, -8));
    var mod    = SinOsc.ar(freq * 2.0) * modEnv;
    var sig    = SinOsc.ar(freq + mod) + (SinOsc.ar(freq * 2) * 0.1 * env);
    sig = sig * env * amp * 0.6;
    Out.ar(out, [sig, sig]);
}).add;

// Wurli - Wurlitzer electric piano with transient bark
SynthDef(\wurli, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=1.5, bark=0.6|
    var env     = EnvGen.kr(Env.perc(attack, release, 1, -5), doneAction: 2);
    var barkEnv = EnvGen.kr(Env.perc(0.001, 0.04, bark, -12));
    var sig = Mix([
        SinOsc.ar(freq),
        SinOsc.ar(freq * 2) * 0.5,
        SinOsc.ar(freq * 3) * 0.15,
        Pulse.ar(freq, 0.45) * barkEnv * 0.3
    ]) * 0.4;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Clavi Synth - Clavinet-style clicky keyboard
SynthDef(\claviSynth, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=0.6, cutoff=3500|
    var env   = EnvGen.kr(Env.perc(attack, release, 1, -6), doneAction: 2);
    var click = EnvGen.kr(Env.perc(0.0005, 0.01, 1, -2)) * Pulse.ar(freq * 8, 0.5) * 0.3;
    var sig   = Mix([Saw.ar(freq), Pulse.ar(freq, 0.5) * 0.5, click]) * 0.4;
    sig = RLPF.ar(sig, cutoff.clip(40, 18000), 0.5);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Tube Bell - Tubular bells with accurate harmonic partials
SynthDef(\tubeBell, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=4.0|
    var env = EnvGen.kr(Env.perc(attack, release, 1, -3), doneAction: 2);
    var sig = Mix([
        SinOsc.ar(freq)         * 1.0,
        SinOsc.ar(freq * 2.756) * 0.55,
        SinOsc.ar(freq * 5.404) * 0.25,
        SinOsc.ar(freq * 8.933) * 0.14,
        SinOsc.ar(freq * 13.34) * 0.07,
        SinOsc.ar(freq * 18.64) * 0.04
    ]) * 0.3;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// FM E-Piano - DX7-style FM electric piano with feedback operator
SynthDef(\fmEpiano, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=2.0, modIndex=4, feedback=0.2|
    var env      = EnvGen.kr(Env.perc(attack, release, 1, -4), doneAction: 2);
    var modEnv   = EnvGen.kr(Env.perc(0.001, release * 0.5, modIndex, -6));
    var fbIn     = LocalIn.ar(1) * feedback;
    var mod      = SinOsc.ar(freq * 14.0, fbIn) * (freq * modEnv);
    var sig      = SinOsc.ar(freq + mod);
    LocalOut.ar(sig);
    sig = sig * env * amp * 0.5;
    Out.ar(out, [sig, sig]);
}).add;

"✅ Instrument SynthDefs loaded".postln;
"   Basic: sine, saw, square, triangle".postln;
"   Advanced: fm, pad, bass, lead, pluck, bell, organ".postln;
"   Extended: supersaw, acidbass, reese, wobble, stab, glide, chiptune, strings, brass, kalimba, glass".postln;
"   Synth: duo, pwm, hoover, polyBrass, fmBell, fmVibes, bowedStr, metalKlank, nylonStr".postln;
"   Bass: fmBass, moogBass, darkBass, punchBass, dubBass, subBass, squareBass".postln;
"   Lead: analogLead, squareLead, fmLead, buzzLead".postln;
"   Pad: warmPad, junoPad, choirPad, spacePad, dreamPad, atmospherePad, loPad".postln;
"   Keys: rhodes, wurli, claviSynth, tubeBell, fmEpiano".postln;
)

