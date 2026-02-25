/*
 * Melodic Instrument SynthDefs - Phase 1
 * 
 * Based on General MIDI standard instrument categories:
 * - Piano (8 instruments): Acoustic Grand, Bright Acoustic, Electric Grand, Honky-tonk, 
 *   Electric Piano 1, Electric Piano 2, Harpsichord, Clavinet
 * - Chromatic Percussion (8 instruments): Celesta, Glockenspiel, Music Box, Vibraphone,
 *   Marimba, Xylophone, Tubular Bells, Dulcimer
 * - Organ (8 instruments): Drawbar, Percussive, Rock, Church, Reed, Accordion, Harmonica, Bandoneon
 * - Guitar (8 instruments): Acoustic Nylon, Acoustic Steel, Electric Jazz, Electric Clean,
 *   Electric Muted, Overdriven, Distortion, Harmonics
 * 
 * Synthesis techniques:
 * - Physical modeling (Karplus-Strong for plucked strings)
 * - Additive synthesis (organ drawbars, bells)
 * - Subtractive synthesis (filtered waveforms)
 * - FM synthesis (electric pianos, bells)
 */

(
// ============================================================================
// PIANO FAMILY (GM 1-8)
// ============================================================================

// 1. Acoustic Grand Piano - Rich, full-bodied piano
SynthDef(\acousticGrandPiano, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, hammer, string;
    // Velocity-sensitive envelope
    env = EnvGen.kr(Env.perc(0.001, 3.0 * velocity, 1, -4), gate, doneAction: 2);
    // Hammer strike (short noise burst)
    hammer = EnvGen.kr(Env.perc(0.001, 0.01)) * WhiteNoise.ar(0.3);
    // String resonance (multiple detuned partials)
    string = Mix([
        SinOsc.ar(freq * 0.999) * 0.3,
        SinOsc.ar(freq) * 0.4,
        SinOsc.ar(freq * 1.001) * 0.3,
        SinOsc.ar(freq * 2) * 0.15,
        SinOsc.ar(freq * 3) * 0.08,
        SinOsc.ar(freq * 4) * 0.04
    ]);
    sig = (hammer + string) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 2. Bright Acoustic Piano - Brighter, more attack
SynthDef(\brightAcousticPiano, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, hammer, string;
    env = EnvGen.kr(Env.perc(0.001, 2.5 * velocity, 1, -5), gate, doneAction: 2);
    hammer = EnvGen.kr(Env.perc(0.0005, 0.008)) * WhiteNoise.ar(0.4);
    string = Mix([
        SinOsc.ar(freq) * 0.4,
        SinOsc.ar(freq * 2) * 0.25,
        SinOsc.ar(freq * 3) * 0.15,
        SinOsc.ar(freq * 4) * 0.1,
        SinOsc.ar(freq * 5) * 0.05
    ]);
    sig = (hammer + string) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 3. Electric Grand Piano - Yamaha CP-70 style
SynthDef(\electricGrandPiano, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, tine;
    env = EnvGen.kr(Env.perc(0.001, 2.0 * velocity, 1, -3), gate, doneAction: 2);
    // Electric piano tine (FM-like partials)
    tine = Mix([
        SinOsc.ar(freq) * 0.5,
        SinOsc.ar(freq * 2.1) * 0.3,
        SinOsc.ar(freq * 3.2) * 0.15,
        SinOsc.ar(freq * 4.3) * 0.08
    ]);
    sig = tine * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 4. Honky-tonk Piano - Detuned, saloon piano
SynthDef(\honkyTonkPiano, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, 2.0 * velocity, 1, -4), gate, doneAction: 2);
    // Heavily detuned strings
    sig = Mix([
        SinOsc.ar(freq * 0.98) * 0.25,
        SinOsc.ar(freq * 1.02) * 0.25,
        SinOsc.ar(freq * 0.99) * 0.2,
        SinOsc.ar(freq * 1.01) * 0.2,
        SinOsc.ar(freq * 2 * 0.98) * 0.1,
        SinOsc.ar(freq * 2 * 1.02) * 0.1
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 5. Electric Piano 1 - Rhodes/Wurlitzer style
SynthDef(\electricPiano1, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, modulator, carrier;
    env = EnvGen.kr(Env.perc(0.001, 1.5 * velocity, 1, -4), gate, doneAction: 2);
    // FM synthesis for bell-like tone
    modulator = SinOsc.ar(freq * 1.4) * (freq * 0.5 * velocity);
    carrier = SinOsc.ar(freq + modulator);
    sig = carrier * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 6. Electric Piano 2 - FM piano (DX7 style)
SynthDef(\electricPiano2, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, modulator, carrier;
    env = EnvGen.kr(Env.perc(0.001, 1.2 * velocity, 1, -5), gate, doneAction: 2);
    // Deeper FM modulation
    modulator = SinOsc.ar(freq * 2) * (freq * 1.0 * velocity);
    carrier = SinOsc.ar(freq + modulator);
    sig = carrier * env * amp * velocity;
    // Add chorus effect
    sig = sig + DelayN.ar(sig, 0.02, SinOsc.kr(0.5).range(0.01, 0.015)) * 0.3;
    Out.ar(out, [sig, sig]);
}).add;

// 7. Harpsichord - Plucked string with quick decay
SynthDef(\harpsichord, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    // Fixed velocity (harpsichords don't have velocity sensitivity)
    env = EnvGen.kr(Env.perc(0.001, 0.8, 1, -6), gate, doneAction: 2);
    // Pluck sound
    pluck = Pluck.ar(
        WhiteNoise.ar(0.1),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        8,
        coef: 0.4
    );
    sig = pluck * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// 8. Clavinet - Funky, percussive electric clavichord
SynthDef(\clavinet, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, string;
    env = EnvGen.kr(Env.perc(0.001, 0.3, 1, -8), gate, doneAction: 2);
    // Bright, filtered pulse wave
    string = Pulse.ar(freq, 0.3);
    sig = RLPF.ar(string, freq * 4, 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// CHROMATIC PERCUSSION (GM 9-16)
// ============================================================================

// 9. Celesta - Delicate bell-like keyboard
SynthDef(\celesta, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, 2.0, 1, -3), gate, doneAction: 2);
    // Bell-like partials
    sig = Mix([
        SinOsc.ar(freq) * 0.5,
        SinOsc.ar(freq * 2.76) * 0.3,
        SinOsc.ar(freq * 5.4) * 0.15,
        SinOsc.ar(freq * 8.2) * 0.08
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 10. Glockenspiel - Bright metallic bells
SynthDef(\glockenspiel, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, 1.5, 1, -4), gate, doneAction: 2);
    // Bright metallic partials
    sig = Mix([
        SinOsc.ar(freq) * 0.4,
        SinOsc.ar(freq * 3.1) * 0.3,
        SinOsc.ar(freq * 5.8) * 0.2,
        SinOsc.ar(freq * 9.2) * 0.1
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 11. Music Box - Delicate, plucked bell sound
SynthDef(\musicBox, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, 1.0, 1, -5), gate, doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq) * 0.6,
        SinOsc.ar(freq * 2) * 0.3,
        SinOsc.ar(freq * 4) * 0.1
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 12. Vibraphone - Mallet percussion with vibrato
SynthDef(\vibraphone, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8, vibratoRate=6|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.perc(0.001, 3.0, 1, -2), gate, doneAction: 2);
    // Vibrato modulation
    vibrato = SinOsc.kr(vibratoRate).range(0.98, 1.02);
    sig = Mix([
        SinOsc.ar(freq * vibrato) * 0.5,
        SinOsc.ar(freq * 2 * vibrato) * 0.25,
        SinOsc.ar(freq * 3 * vibrato) * 0.15,
        SinOsc.ar(freq * 4 * vibrato) * 0.1
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 13. Marimba - Wooden mallet percussion
SynthDef(\marimba, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, mallet;
    env = EnvGen.kr(Env.perc(0.001, 1.5, 1, -4), gate, doneAction: 2);
    // Mallet strike
    mallet = EnvGen.kr(Env.perc(0.001, 0.02)) * WhiteNoise.ar(0.2);
    // Wooden resonance
    sig = Mix([
        SinOsc.ar(freq) * 0.6,
        SinOsc.ar(freq * 2.1) * 0.25,
        SinOsc.ar(freq * 3.3) * 0.15
    ]);
    sig = (sig + mallet) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 14. Xylophone - Bright wooden percussion
SynthDef(\xylophone, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, mallet;
    env = EnvGen.kr(Env.perc(0.001, 0.8, 1, -6), gate, doneAction: 2);
    mallet = EnvGen.kr(Env.perc(0.0005, 0.01)) * WhiteNoise.ar(0.3);
    sig = Mix([
        SinOsc.ar(freq) * 0.5,
        SinOsc.ar(freq * 3) * 0.3,
        SinOsc.ar(freq * 5) * 0.2
    ]);
    sig = (sig + mallet) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 15. Tubular Bells - Large resonant bells
SynthDef(\tubularBells, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, 4.0, 1, -2), gate, doneAction: 2);
    // Deep bell partials
    sig = Mix([
        SinOsc.ar(freq) * 0.5,
        SinOsc.ar(freq * 2.76) * 0.3,
        SinOsc.ar(freq * 5.4) * 0.15,
        SinOsc.ar(freq * 8.93) * 0.08,
        SinOsc.ar(freq * 13.2) * 0.04
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 16. Dulcimer - Hammered string instrument
SynthDef(\dulcimer, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, hammer;
    env = EnvGen.kr(Env.perc(0.001, 2.0, 1, -3), gate, doneAction: 2);
    hammer = EnvGen.kr(Env.perc(0.001, 0.015)) * WhiteNoise.ar(0.2);
    // String resonance
    sig = Mix([
        SinOsc.ar(freq * 0.999) * 0.3,
        SinOsc.ar(freq) * 0.4,
        SinOsc.ar(freq * 1.001) * 0.3,
        SinOsc.ar(freq * 2) * 0.15
    ]);
    sig = (sig + hammer) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// ORGAN (GM 17-24)
// ============================================================================

// 17. Drawbar Organ - Hammond B3 style
SynthDef(\drawbarOrgan, { |out=0, freq=440, amp=0.5, gate=1, drawbar1=0.8, drawbar2=0.6, drawbar3=0.4|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.01, 1, 0.1), gate, doneAction: 2);
    // Drawbar harmonics (16', 8', 4', 2 2/3', 2', 1 3/5', 1 1/3')
    sig = Mix([
        SinOsc.ar(freq * 0.5) * drawbar1,      // 16' (sub-octave)
        SinOsc.ar(freq) * drawbar2,            // 8' (fundamental)
        SinOsc.ar(freq * 2) * drawbar3,        // 4' (octave)
        SinOsc.ar(freq * 3) * (drawbar3 * 0.5), // 2 2/3' (fifth)
        SinOsc.ar(freq * 4) * (drawbar3 * 0.3)  // 2' (two octaves)
    ]) * 0.25;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// 18. Percussive Organ - With attack click
SynthDef(\percussiveOrgan, { |out=0, freq=440, amp=0.5, gate=1|
    var env, sig, click;
    env = EnvGen.kr(Env.asr(0.001, 1, 0.05), gate, doneAction: 2);
    // Percussive click
    click = EnvGen.kr(Env.perc(0.001, 0.02)) * SinOsc.ar(freq * 8) * 0.3;
    sig = Mix([
        SinOsc.ar(freq) * 0.5,
        SinOsc.ar(freq * 2) * 0.3,
        SinOsc.ar(freq * 3) * 0.2
    ]) * 0.4;
    sig = (sig + click) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// 19. Rock Organ - Bright, overdriven organ
SynthDef(\rockOrgan, { |out=0, freq=440, amp=0.5, gate=1|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.005, 1, 0.05), gate, doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq) * 0.5,
        SinOsc.ar(freq * 2) * 0.4,
        SinOsc.ar(freq * 3) * 0.3,
        SinOsc.ar(freq * 4) * 0.2
    ]) * 0.3;
    // Add distortion
    sig = (sig * 2).tanh;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// 20. Church Organ - Pipe organ sound
SynthDef(\churchOrgan, { |out=0, freq=440, amp=0.5, gate=1|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.3), gate, doneAction: 2);
    // Pipe organ harmonics
    sig = Mix([
        SinOsc.ar(freq * 0.5) * 0.3,
        SinOsc.ar(freq) * 0.5,
        SinOsc.ar(freq * 2) * 0.3,
        SinOsc.ar(freq * 3) * 0.2,
        SinOsc.ar(freq * 4) * 0.1,
        SinOsc.ar(freq * 5) * 0.05
    ]) * 0.25;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// 21. Reed Organ - Harmonium style
SynthDef(\reedOrgan, { |out=0, freq=440, amp=0.5, gate=1|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.05, 1, 0.2), gate, doneAction: 2);
    // Reed-like sound (sawtooth-based)
    sig = Mix([
        Saw.ar(freq) * 0.4,
        Saw.ar(freq * 2) * 0.2,
        Saw.ar(freq * 3) * 0.1
    ]);
    sig = LPF.ar(sig, freq * 4);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// 22. Accordion - Musette tuning
SynthDef(\accordion, { |out=0, freq=440, amp=0.5, gate=1|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.05, 1, 0.15), gate, doneAction: 2);
    // Detuned reeds (musette effect)
    sig = Mix([
        Saw.ar(freq * 0.99) * 0.25,
        Saw.ar(freq) * 0.3,
        Saw.ar(freq * 1.01) * 0.25,
        Saw.ar(freq * 2) * 0.15
    ]);
    sig = LPF.ar(sig, freq * 5);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// 23. Harmonica - Blues harp
SynthDef(\harmonica, { |out=0, freq=440, amp=0.5, gate=1|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.02, 1, 0.1), gate, doneAction: 2);
    // Reed vibration
    sig = Mix([
        Pulse.ar(freq, 0.5) * 0.4,
        Pulse.ar(freq * 2, 0.5) * 0.2,
        Pulse.ar(freq * 3, 0.5) * 0.1
    ]);
    sig = LPF.ar(sig, freq * 6);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// 24. Bandoneon - Tango accordion
SynthDef(\bandoneon, { |out=0, freq=440, amp=0.5, gate=1|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.08, 1, 0.2), gate, doneAction: 2);
    sig = Mix([
        Saw.ar(freq * 0.995) * 0.3,
        Saw.ar(freq * 1.005) * 0.3,
        Saw.ar(freq * 2) * 0.2,
        Saw.ar(freq * 3) * 0.1
    ]);
    sig = LPF.ar(sig, freq * 4);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// GUITAR (GM 25-32)
// ============================================================================

// 25. Acoustic Guitar (Nylon) - Classical guitar
SynthDef(\acousticGuitarNylon, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck, body;
    env = EnvGen.kr(Env.perc(0.001, 2.0 * velocity, 1, -3), gate, doneAction: 2);
    // Karplus-Strong plucked string
    pluck = Pluck.ar(
        WhiteNoise.ar(0.1),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        10,
        coef: 0.5
    );
    // Body resonance
    body = BPF.ar(pluck, freq * 1.5, 0.5) * 0.3;
    sig = (pluck + body) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 26. Acoustic Guitar (Steel) - Brighter, more attack
SynthDef(\acousticGuitarSteel, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck, body;
    env = EnvGen.kr(Env.perc(0.001, 2.5 * velocity, 1, -3), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.15),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        12,
        coef: 0.4
    );
    // Brighter body resonance
    body = BPF.ar(pluck, freq * 2, 0.4) * 0.4;
    sig = (pluck + body) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 27. Electric Guitar (Jazz) - Warm, mellow
SynthDef(\electricGuitarJazz, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 1.5 * velocity, 1, -4), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.1),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        8,
        coef: 0.6
    );
    sig = LPF.ar(pluck, freq * 3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 28. Electric Guitar (Clean) - Stratocaster through Jazz Chorus
SynthDef(\electricGuitarClean, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 2.0 * velocity, 1, -3), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.12),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        10,
        coef: 0.5
    );
    // Chorus effect
    sig = pluck + DelayN.ar(pluck, 0.02, SinOsc.kr(0.8).range(0.01, 0.015)) * 0.4;
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 29. Electric Guitar (Muted) - Palm muted
SynthDef(\electricGuitarMuted, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 0.3, 1, -8), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.1),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        3,
        coef: 0.7
    );
    sig = LPF.ar(pluck, freq * 2);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 30. Overdriven Guitar - Tube amp overdrive
SynthDef(\overdrivenGuitar, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 1.5 * velocity, 1, -3), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.15),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        10,
        coef: 0.4
    );
    // Overdrive
    sig = (pluck * 3).tanh;
    sig = LPF.ar(sig, freq * 4);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 31. Distortion Guitar - Heavy distortion
SynthDef(\distortionGuitar, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 1.2 * velocity, 1, -4), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.2),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        12,
        coef: 0.3
    );
    // Heavy distortion
    sig = (pluck * 5).distort;
    sig = LPF.ar(sig, freq * 5);
    sig = sig * env * amp * velocity * 0.7;
    Out.ar(out, [sig, sig]);
}).add;

// 32. Guitar Harmonics - Natural and artificial harmonics
SynthDef(\guitarHarmonics, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, 3.0, 1, -2), gate, doneAction: 2);
    // Pure harmonics (octaves and fifths)
    sig = Mix([
        SinOsc.ar(freq * 2) * 0.5,
        SinOsc.ar(freq * 3) * 0.3,
        SinOsc.ar(freq * 4) * 0.2,
        SinOsc.ar(freq * 5) * 0.1
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// BASS (GM 33-40)
// ============================================================================

// 33. Acoustic Bass - Upright double bass
SynthDef(\acousticBass, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck, body;
    env = EnvGen.kr(Env.perc(0.001, 1.5 * velocity, 1, -4), gate, doneAction: 2);
    // Plucked string
    pluck = Pluck.ar(
        WhiteNoise.ar(0.1),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        8,
        coef: 0.6
    );
    // Deep body resonance
    body = RLPF.ar(pluck, freq * 1.5, 0.3) * 0.5;
    sig = (pluck + body) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 34. Electric Bass (Finger) - Fingerstyle electric bass
SynthDef(\electricBassFinger, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 1.2 * velocity, 1, -3), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.12),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        10,
        coef: 0.5
    );
    sig = RLPF.ar(pluck, freq * 3, 0.4);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 35. Electric Bass (Pick) - Picked electric bass (brighter)
SynthDef(\electricBassPick, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 1.0 * velocity, 1, -4), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.15),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        12,
        coef: 0.4
    );
    sig = RLPF.ar(pluck, freq * 4, 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 36. Fretless Bass - Smooth fretless bass
SynthDef(\fretlessBass, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 1.3 * velocity, 1, -3), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.1),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        10,
        coef: 0.55
    );
    // Smoother filter for fretless character
    sig = LPF.ar(pluck, freq * 3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 37. Slap Bass 1 - Aggressive slap bass
SynthDef(\slapBass1, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck, slap;
    env = EnvGen.kr(Env.perc(0.001, 0.6, 1, -6), gate, doneAction: 2);
    // Slap sound (bright attack)
    slap = EnvGen.kr(Env.perc(0.0005, 0.02)) * WhiteNoise.ar(0.4);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.15),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        8,
        coef: 0.3
    );
    sig = (pluck + slap) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 38. Slap Bass 2 - Funkier slap bass
SynthDef(\slapBass2, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck, slap;
    env = EnvGen.kr(Env.perc(0.001, 0.5, 1, -7), gate, doneAction: 2);
    slap = EnvGen.kr(Env.perc(0.0003, 0.015)) * WhiteNoise.ar(0.5);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.2),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        6,
        coef: 0.25
    );
    sig = RLPF.ar(pluck + slap, freq * 5, 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 39. Synth Bass 1 - Analog synth bass
SynthDef(\synthBass1, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, filterEnv, sig;
    env = EnvGen.kr(Env.adsr(0.001, 0.3, 0.6, 0.2), gate, doneAction: 2);
    filterEnv = EnvGen.kr(Env.adsr(0.001, 0.2, 0.3, 0.1));
    sig = Mix([
        Saw.ar(freq) * 0.6,
        Pulse.ar(freq, 0.5) * 0.4
    ]);
    sig = RLPF.ar(sig, (freq * 2 * filterEnv) + (freq * 1.5), 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 40. Synth Bass 2 - Resonant synth bass
SynthDef(\synthBass2, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, filterEnv, sig;
    env = EnvGen.kr(Env.adsr(0.001, 0.4, 0.5, 0.3), gate, doneAction: 2);
    filterEnv = EnvGen.kr(Env.adsr(0.001, 0.3, 0.2, 0.2));
    sig = Saw.ar(freq);
    sig = RLPF.ar(sig, (freq * 3 * filterEnv) + (freq * 1.2), 0.2);
    sig = (sig * 1.5).tanh; // Slight saturation
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

"✅ Melodic Instruments loaded (Phase 1 - COMPLETE)".postln;
"".postln;
"   PIANO (8): acousticGrandPiano, brightAcousticPiano, electricGrandPiano, honkyTonkPiano,".postln;
"             electricPiano1, electricPiano2, harpsichord, clavinet".postln;
"   CHROMATIC PERCUSSION (8): celesta, glockenspiel, musicBox, vibraphone,".postln;
"                             marimba, xylophone, tubularBells, dulcimer".postln;
"   ORGAN (8): drawbarOrgan, percussiveOrgan, rockOrgan, churchOrgan,".postln;
"             reedOrgan, accordion, harmonica, bandoneon".postln;
"   GUITAR (8): acousticGuitarNylon, acousticGuitarSteel, electricGuitarJazz, electricGuitarClean,".postln;
"              electricGuitarMuted, overdrivenGuitar, distortionGuitar, guitarHarmonics".postln;
"".postln;
// ============================================================================
// STRINGS (GM 41-48)
// ============================================================================

// 41. Violin - Bowed string instrument (Physical modeling with waveguide)
SynthDef(\violin, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8, vibrato=5, bowPressure=0.7|
    var env, sig, bow, vibr, exciter, resonator, formants;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);

    // Vibrato (natural violin vibrato)
    vibr = SinOsc.kr(vibrato).range(0.995, 1.005);

    // Bow exciter: Filtered noise with pressure control
    bow = LFNoise1.ar(3000) * bowPressure * velocity;
    bow = HPF.ar(bow, 200);

    // Waveguide resonator (Karplus-Strong-like delay line)
    exciter = bow + (Impulse.ar(0) * 0.3);  // Initial attack
    resonator = CombL.ar(exciter, 0.1, (freq * vibr).reciprocal, 8);

    // Add harmonic richness with multiple delay lines (body resonance)
    resonator = resonator + (CombL.ar(exciter, 0.1, (freq * 2 * vibr).reciprocal, 4) * 0.3);
    resonator = resonator + (CombL.ar(exciter, 0.1, (freq * 3 * vibr).reciprocal, 2) * 0.15);

    // Violin formants (body resonances around 300Hz, 900Hz, 2500Hz)
    formants = BPF.ar(resonator, 300, 0.5, 0.3) +
               BPF.ar(resonator, 900, 0.4, 0.4) +
               BPF.ar(resonator, 2500, 0.3, 0.3);

    sig = (resonator * 0.6 + formants * 0.4) * env * amp;
    sig = LPF.ar(sig, 8000);  // Natural high-frequency rolloff
    Out.ar(out, [sig, sig]);
}).add;

// 42. Viola - Deeper than violin (Physical modeling, warmer formants)
SynthDef(\viola, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8, vibrato=4.5, bowPressure=0.75|
    var env, sig, bow, vibr, exciter, resonator, formants;
    env = EnvGen.kr(Env.asr(0.12, 1, 0.25), gate, doneAction: 2);

    // Slower, wider vibrato for viola
    vibr = SinOsc.kr(vibrato).range(0.996, 1.004);

    // Bow exciter with more weight
    bow = LFNoise1.ar(2500) * bowPressure * velocity;
    bow = HPF.ar(bow, 150);

    // Waveguide resonator
    exciter = bow + (Impulse.ar(0) * 0.35);
    resonator = CombL.ar(exciter, 0.1, (freq * vibr).reciprocal, 9);
    resonator = resonator + (CombL.ar(exciter, 0.1, (freq * 2 * vibr).reciprocal, 5) * 0.35);
    resonator = resonator + (CombL.ar(exciter, 0.1, (freq * 3 * vibr).reciprocal, 2.5) * 0.2);

    // Viola formants (lower than violin: 250Hz, 750Hz, 2200Hz)
    formants = BPF.ar(resonator, 250, 0.6, 0.35) +
               BPF.ar(resonator, 750, 0.5, 0.4) +
               BPF.ar(resonator, 2200, 0.4, 0.25);

    sig = (resonator * 0.65 + formants * 0.35) * env * amp;
    sig = LPF.ar(sig, 7000);
    Out.ar(out, [sig, sig]);
}).add;

// 43. Cello - Rich, warm low strings (Physical modeling, deep resonance)
SynthDef(\cello, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8, vibrato=4, bowPressure=0.8|
    var env, sig, bow, vibr, exciter, resonator, formants, bodyResonance;
    env = EnvGen.kr(Env.asr(0.15, 1, 0.3), gate, doneAction: 2);

    // Slower, narrower vibrato for cello
    vibr = SinOsc.kr(vibrato).range(0.997, 1.003);

    // Heavier bow exciter for cello
    bow = LFNoise1.ar(2000) * bowPressure * velocity;
    bow = HPF.ar(bow, 100);

    // Waveguide resonator with longer decay
    exciter = bow + (Impulse.ar(0) * 0.4);
    resonator = CombL.ar(exciter, 0.1, (freq * vibr).reciprocal, 10);
    resonator = resonator + (CombL.ar(exciter, 0.1, (freq * 2 * vibr).reciprocal, 6) * 0.4);
    resonator = resonator + (CombL.ar(exciter, 0.1, (freq * 3 * vibr).reciprocal, 3) * 0.25);

    // Cello formants (deep: 200Hz, 600Hz, 2000Hz)
    formants = BPF.ar(resonator, 200, 0.7, 0.4) +
               BPF.ar(resonator, 600, 0.6, 0.35) +
               BPF.ar(resonator, 2000, 0.5, 0.25);

    // Large body resonance
    bodyResonance = Resonz.ar(resonator, freq * 0.5, 0.05) * 0.3;

    sig = (resonator * 0.5 + formants * 0.35 + bodyResonance * 0.15) * env * amp;
    sig = LPF.ar(sig, 6000);
    Out.ar(out, [sig, sig]);
}).add;

// 44. Contrabass - Deep double bass (Physical modeling, massive body)
SynthDef(\contrabass, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8, bowPressure=0.85|
    var env, sig, bow, exciter, resonator, formants, bodyResonance;
    env = EnvGen.kr(Env.asr(0.2, 1, 0.4), gate, doneAction: 2);

    // Very heavy bow exciter
    bow = LFNoise1.ar(1500) * bowPressure * velocity;
    bow = HPF.ar(bow, 60);

    // Waveguide resonator with very long decay
    exciter = bow + (Impulse.ar(0) * 0.5);
    resonator = CombL.ar(exciter, 0.1, freq.reciprocal, 12);
    resonator = resonator + (CombL.ar(exciter, 0.1, (freq * 2).reciprocal, 7) * 0.45);
    resonator = resonator + (CombL.ar(exciter, 0.1, (freq * 3).reciprocal, 3.5) * 0.3);

    // Contrabass formants (very deep: 150Hz, 450Hz, 1500Hz)
    formants = BPF.ar(resonator, 150, 0.8, 0.45) +
               BPF.ar(resonator, 450, 0.7, 0.35) +
               BPF.ar(resonator, 1500, 0.6, 0.2);

    // Massive body resonance
    bodyResonance = Resonz.ar(resonator, freq * 0.5, 0.03) * 0.4;

    sig = (resonator * 0.45 + formants * 0.35 + bodyResonance * 0.2) * env * amp;
    sig = LPF.ar(sig, 5000);
    Out.ar(out, [sig, sig]);
}).add;

// 45. Tremolo Strings - Rapid bowing tremolo
SynthDef(\tremoloStrings, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, tremolo;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);
    // Tremolo effect (amplitude modulation)
    tremolo = SinOsc.kr(12).range(0.3, 1.0);
    sig = Mix([
        Saw.ar(freq) * 0.5,
        Saw.ar(freq * 2) * 0.25,
        Saw.ar(freq * 3) * 0.15,
        Saw.ar(freq * 4) * 0.1
    ]);
    sig = RLPF.ar(sig, freq * 4, 0.3);
    sig = sig * tremolo * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 46. Pizzicato Strings - Plucked strings
SynthDef(\pizzicatoStrings, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 0.8, 1, -5), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.1),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        10,
        coef: 0.5
    );
    sig = pluck * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 47. Orchestral Harp - Concert harp
SynthDef(\orchestralHarp, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 2.5, 1, -3), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.08),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        12,
        coef: 0.6
    );
    // Add harmonic resonance
    sig = pluck + (BPF.ar(pluck, freq * 2, 0.5) * 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 48. Timpani - Orchestral kettle drums
SynthDef(\timpani, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, pitchEnv, sig, mallet;
    env = EnvGen.kr(Env.perc(0.001, 1.5, 1, -3), gate, doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.05, 1.2, -8));
    // Mallet strike
    mallet = EnvGen.kr(Env.perc(0.001, 0.02)) * WhiteNoise.ar(0.3);
    // Resonant drum head
    sig = SinOsc.ar(freq * pitchEnv) * 0.7;
    sig = sig + (RLPF.ar(mallet, freq * 2, 0.3) * 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// ENSEMBLE (GM 49-56)
// ============================================================================

// 49. String Ensemble 1 - Slow strings
SynthDef(\stringEnsemble1, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.3, 1, 0.5), gate, doneAction: 2);
    vibrato = SinOsc.kr(4.5).range(0.997, 1.003);
    // Multiple detuned voices for ensemble effect
    sig = Mix([
        Saw.ar(freq * 0.998 * vibrato) * 0.2,
        Saw.ar(freq * 0.999 * vibrato) * 0.2,
        Saw.ar(freq * vibrato) * 0.2,
        Saw.ar(freq * 1.001 * vibrato) * 0.2,
        Saw.ar(freq * 1.002 * vibrato) * 0.2
    ]);
    sig = RLPF.ar(sig, freq * 3.5, 0.4);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 50. String Ensemble 2 - Faster strings
SynthDef(\stringEnsemble2, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.15, 1, 0.3), gate, doneAction: 2);
    vibrato = SinOsc.kr(5.5).range(0.996, 1.004);
    sig = Mix([
        Saw.ar(freq * 0.997 * vibrato) * 0.2,
        Saw.ar(freq * 0.999 * vibrato) * 0.2,
        Saw.ar(freq * vibrato) * 0.2,
        Saw.ar(freq * 1.001 * vibrato) * 0.2,
        Saw.ar(freq * 1.003 * vibrato) * 0.2
    ]);
    sig = RLPF.ar(sig, freq * 4, 0.35);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 51. Synth Strings 1 - Analog string synth (Supersaw with chorus)
SynthDef(\synthStrings1, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, chorus, left, right;
    env = EnvGen.kr(Env.asr(0.2, 1, 0.4), gate, doneAction: 2);

    // Supersaw: 7 detuned sawtooths for thick ensemble sound
    sig = Mix([
        Saw.ar(freq * 0.996) * 0.14,
        Saw.ar(freq * 0.998) * 0.15,
        Saw.ar(freq * 0.999) * 0.16,
        Saw.ar(freq) * 0.18,
        Saw.ar(freq * 1.001) * 0.16,
        Saw.ar(freq * 1.002) * 0.15,
        Saw.ar(freq * 1.004) * 0.14
    ]);

    // Add pulse waves for body
    sig = sig + Mix([
        Pulse.ar(freq * 0.999, 0.5) * 0.1,
        Pulse.ar(freq * 1.001, 0.5) * 0.1
    ]);

    // Gentle low-pass filtering
    sig = LPF.ar(sig, freq * 4);

    // Stereo chorus effect for width
    left = DelayC.ar(sig, 0.05, LFNoise1.kr(0.5).range(0.01, 0.02));
    right = DelayC.ar(sig, 0.05, LFNoise1.kr(0.6).range(0.01, 0.02));

    sig = [left, right] * env * amp * velocity * 0.7;
    Out.ar(out, sig);
}).add;

// 52. Synth Strings 2 - Brighter synth strings (Supersaw with more harmonics)
SynthDef(\synthStrings2, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, chorus, left, right;
    env = EnvGen.kr(Env.asr(0.15, 1, 0.3), gate, doneAction: 2);

    // Wider detuning for brighter, more aggressive sound
    sig = Mix([
        Saw.ar(freq * 0.995) * 0.14,
        Saw.ar(freq * 0.997) * 0.15,
        Saw.ar(freq * 0.999) * 0.16,
        Saw.ar(freq) * 0.18,
        Saw.ar(freq * 1.001) * 0.16,
        Saw.ar(freq * 1.003) * 0.15,
        Saw.ar(freq * 1.005) * 0.14
    ]);

    // Brighter filtering with resonance
    sig = RLPF.ar(sig, freq * 6, 0.3);

    // Stereo chorus with faster modulation
    left = DelayC.ar(sig, 0.05, LFNoise1.kr(0.7).range(0.008, 0.018));
    right = DelayC.ar(sig, 0.05, LFNoise1.kr(0.8).range(0.008, 0.018));

    sig = [left, right] * env * amp * velocity * 0.7;
    Out.ar(out, sig);
}).add;

// 53. Choir Aahs - Vocal choir (ah vowel)
SynthDef(\choirAahs, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.3, 1, 0.5), gate, doneAction: 2);
    vibrato = SinOsc.kr(5).range(0.998, 1.002);
    // Formant-like filtering for vocal quality
    sig = Mix([
        Saw.ar(freq * 0.998 * vibrato) * 0.2,
        Saw.ar(freq * vibrato) * 0.3,
        Saw.ar(freq * 1.002 * vibrato) * 0.2,
        Saw.ar(freq * 2 * vibrato) * 0.15,
        Saw.ar(freq * 3 * vibrato) * 0.1
    ]);
    // Formant peaks for "ah" vowel (around 700Hz and 1200Hz)
    sig = BPF.ar(sig, 700, 0.5) + BPF.ar(sig, 1200, 0.5) + (LPF.ar(sig, 2000) * 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 54. Voice Oohs - Vocal choir (oo vowel)
SynthDef(\voiceOohs, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.25, 1, 0.4), gate, doneAction: 2);
    vibrato = SinOsc.kr(4.5).range(0.998, 1.002);
    sig = Mix([
        Saw.ar(freq * 0.999 * vibrato) * 0.25,
        Saw.ar(freq * vibrato) * 0.3,
        Saw.ar(freq * 1.001 * vibrato) * 0.25,
        Saw.ar(freq * 2 * vibrato) * 0.1
    ]);
    // Formant for "oo" vowel (darker, around 400Hz)
    sig = BPF.ar(sig, 400, 0.6) + (LPF.ar(sig, 1000) * 0.4);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 55. Synth Voice - Synthesized vocal
SynthDef(\synthVoice, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);
    vibrato = SinOsc.kr(6).range(0.997, 1.003);
    sig = Mix([
        Pulse.ar(freq * vibrato, 0.3) * 0.4,
        Pulse.ar(freq * 2 * vibrato, 0.4) * 0.3,
        Saw.ar(freq * vibrato) * 0.3
    ]);
    sig = RLPF.ar(sig, freq * 4, 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 56. Orchestra Hit - Orchestral stab
SynthDef(\orchestraHit, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, brass, strings, perc;
    env = EnvGen.kr(Env.perc(0.001, 0.8, 1, -4), gate, doneAction: 2);
    // Brass component
    brass = Mix([
        Saw.ar(freq) * 0.3,
        Saw.ar(freq * 2) * 0.2
    ]);
    // String component
    strings = Mix([
        Saw.ar(freq * 0.999) * 0.2,
        Saw.ar(freq * 1.001) * 0.2
    ]);
    // Percussive component
    perc = EnvGen.kr(Env.perc(0.001, 0.05)) * WhiteNoise.ar(0.4);
    sig = (brass + strings + perc) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// BRASS (GM 57-64)
// ============================================================================

// 57. Trumpet - Bright brass (FM synthesis with 1:1 carrier/modulator ratio)
SynthDef(\trumpet, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, modEnv, sig, vibrato, modulator, carrier, modIndex;
    env = EnvGen.kr(Env.asr(0.05, 1, 0.1), gate, doneAction: 2);

    // Modulation envelope (brightness control)
    modEnv = EnvGen.kr(Env.asr(0.02, 0.8, 0.15));

    // Vibrato
    vibrato = SinOsc.kr(5).range(0.998, 1.002);

    // FM synthesis: 1:1 ratio for harmonic brass spectrum
    // Modulation index controls brightness (higher = brighter)
    modIndex = (2 + (velocity * 3)) * modEnv;  // Dynamic brightness
    modulator = SinOsc.ar(freq * vibrato) * (freq * modIndex);
    carrier = SinOsc.ar(freq * vibrato + modulator);

    // Add slight second partial for more complexity
    carrier = carrier + (SinOsc.ar(freq * 2 * vibrato) * 0.15);

    // Brass formant filtering (emphasize 1000-1500Hz)
    sig = BPF.ar(carrier, 1200, 0.8, 2) + (carrier * 0.5);
    sig = LPF.ar(sig, 8000);

    sig = sig * env * amp * velocity * 0.7;
    Out.ar(out, [sig, sig]);
}).add;

// 58. Trombone - Deeper brass (FM synthesis, warmer than trumpet)
SynthDef(\trombone, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, modEnv, sig, modulator, carrier, modIndex;
    env = EnvGen.kr(Env.asr(0.08, 1, 0.15), gate, doneAction: 2);

    // Slower modulation envelope for warmer attack
    modEnv = EnvGen.kr(Env.asr(0.05, 0.75, 0.2));

    // FM synthesis: 1:1 ratio, lower modulation index for warmth
    modIndex = (1.5 + (velocity * 2.5)) * modEnv;
    modulator = SinOsc.ar(freq) * (freq * modIndex);
    carrier = SinOsc.ar(freq + modulator);

    // Add fundamental and second partial
    carrier = carrier + (SinOsc.ar(freq * 2) * 0.2);

    // Trombone formant (emphasize 600-900Hz)
    sig = BPF.ar(carrier, 750, 0.9, 2.5) + (carrier * 0.5);
    sig = LPF.ar(sig, 7000);

    sig = sig * env * amp * velocity * 0.75;
    Out.ar(out, [sig, sig]);
}).add;

// 59. Tuba - Deep bass brass (FM synthesis, very low modulation index)
SynthDef(\tuba, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, modEnv, sig, modulator, carrier, modIndex;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);

    // Gentle modulation envelope
    modEnv = EnvGen.kr(Env.asr(0.08, 0.7, 0.25));

    // FM synthesis: 1:1 ratio, low modulation index for deep, mellow tone
    modIndex = (1 + (velocity * 2)) * modEnv;
    modulator = SinOsc.ar(freq) * (freq * modIndex);
    carrier = SinOsc.ar(freq + modulator);

    // Strong fundamental, weak harmonics
    carrier = carrier + (SinOsc.ar(freq * 2) * 0.15);

    // Tuba formant (emphasize 400-600Hz)
    sig = BPF.ar(carrier, 500, 1.0, 3) + (carrier * 0.6);
    sig = LPF.ar(sig, 5000);

    sig = sig * env * amp * velocity * 0.8;
    Out.ar(out, [sig, sig]);
}).add;

// 60. Muted Trumpet - Trumpet with mute
SynthDef(\mutedTrumpet, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.03, 1, 0.08), gate, doneAction: 2);
    vibrato = SinOsc.kr(5.5).range(0.998, 1.002);
    sig = Mix([
        Saw.ar(freq * vibrato) * 0.5,
        Saw.ar(freq * 2 * vibrato) * 0.3,
        Saw.ar(freq * 3 * vibrato) * 0.2
    ]);
    // Narrower filter for muted effect
    sig = BPF.ar(sig, freq * 3, 0.2);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 61. French Horn - Warm, mellow brass (FM synthesis, smooth and round)
SynthDef(\frenchHorn, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, modEnv, sig, modulator, carrier, modIndex;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);

    // Smooth modulation envelope
    modEnv = EnvGen.kr(Env.asr(0.08, 0.65, 0.3));

    // FM synthesis: 1:1 ratio, moderate modulation for warmth
    modIndex = (1.2 + (velocity * 2.2)) * modEnv;
    modulator = SinOsc.ar(freq) * (freq * modIndex);
    carrier = SinOsc.ar(freq + modulator);

    // Add harmonics for richness
    carrier = carrier + (SinOsc.ar(freq * 2) * 0.25);
    carrier = carrier + (SinOsc.ar(freq * 3) * 0.1);

    // French horn formant (emphasize 700-1000Hz)
    sig = BPF.ar(carrier, 850, 0.85, 2.2) + (carrier * 0.55);
    sig = LPF.ar(sig, 6000);

    sig = sig * env * amp * velocity * 0.7;
    Out.ar(out, [sig, sig]);
}).add;

// 62. Brass Section - Full brass ensemble
SynthDef(\brassSection, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.08, 1, 0.15), gate, doneAction: 2);
    // Multiple detuned voices
    sig = Mix([
        Saw.ar(freq * 0.998) * 0.2,
        Saw.ar(freq * 0.999) * 0.2,
        Saw.ar(freq) * 0.2,
        Saw.ar(freq * 1.001) * 0.2,
        Saw.ar(freq * 1.002) * 0.2,
        Saw.ar(freq * 2) * 0.15
    ]);
    sig = RLPF.ar(sig, freq * 4.5, 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 63. Synth Brass 1 - Analog brass synth (Detuned sawtooths + aggressive filter sweep)
SynthDef(\synthBrass1, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, filterEnv, sig, cutoff;
    env = EnvGen.kr(Env.asr(0.05, 1, 0.1), gate, doneAction: 2);

    // Aggressive filter envelope for classic synth brass
    filterEnv = EnvGen.kr(Env.asr(0.05, 0.8, 0.2));

    // Multiple detuned sawtooths for thickness
    sig = Mix([
        Saw.ar(freq * 0.997) * 0.2,
        Saw.ar(freq * 0.999) * 0.2,
        Saw.ar(freq) * 0.2,
        Saw.ar(freq * 1.001) * 0.2,
        Saw.ar(freq * 1.003) * 0.2
    ]);

    // Dynamic filter sweep (classic synth brass technique)
    cutoff = (freq * 8 * filterEnv * velocity) + (freq * 1.5);
    sig = RLPF.ar(sig, cutoff.clip(100, 12000), 0.25);

    // Soft saturation for analog warmth
    sig = (sig * 1.2).tanh;

    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 64. Synth Brass 2 - Brighter synth brass (Saw + PWM + sharper filter)
SynthDef(\synthBrass2, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, filterEnv, sig, cutoff, pwm;
    env = EnvGen.kr(Env.asr(0.03, 1, 0.08), gate, doneAction: 2);

    // Faster, brighter filter envelope
    filterEnv = EnvGen.kr(Env.asr(0.03, 0.9, 0.15));

    // PWM (pulse width modulation) for movement
    pwm = SinOsc.kr(0.3).range(0.2, 0.8);

    // Mix of detuned saws and PWM pulse
    sig = Mix([
        Saw.ar(freq * 0.998) * 0.22,
        Saw.ar(freq) * 0.25,
        Saw.ar(freq * 1.002) * 0.22,
        Pulse.ar(freq, pwm) * 0.31
    ]);

    // Sharper filter sweep for brightness
    cutoff = (freq * 10 * filterEnv * velocity) + (freq * 2);
    sig = RLPF.ar(sig, cutoff.clip(100, 15000), 0.2);

    // Harder saturation for edge
    sig = (sig * 1.3).tanh;

    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

"✅ Melodic Instruments loaded (Phase 1 - COMPLETE)".postln;
"".postln;
"   PIANO (8): acousticGrandPiano, brightAcousticPiano, electricGrandPiano, honkyTonkPiano,".postln;
"             electricPiano1, electricPiano2, harpsichord, clavinet".postln;
"   CHROMATIC PERCUSSION (8): celesta, glockenspiel, musicBox, vibraphone,".postln;
"                             marimba, xylophone, tubularBells, dulcimer".postln;
"   ORGAN (8): drawbarOrgan, percussiveOrgan, rockOrgan, churchOrgan,".postln;
"             reedOrgan, accordion, harmonica, bandoneon".postln;
"   GUITAR (8): acousticGuitarNylon, acousticGuitarSteel, electricGuitarJazz, electricGuitarClean,".postln;
"              electricGuitarMuted, overdrivenGuitar, distortionGuitar, guitarHarmonics".postln;
"".postln;
// ============================================================================
// REED (GM 65-72)
// ============================================================================

// 65. Soprano Sax - High saxophone
SynthDef(\sopranoSax, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato, breath;
    env = EnvGen.kr(Env.asr(0.05, 1, 0.1), gate, doneAction: 2);
    vibrato = SinOsc.kr(5.5).range(0.997, 1.003);
    // Breath noise
    breath = LPF.ar(WhiteNoise.ar(0.1), freq * 2);
    // Reed tone (square-ish with harmonics)
    sig = Mix([
        Pulse.ar(freq * vibrato, 0.4) * 0.5,
        Saw.ar(freq * vibrato) * 0.3,
        Saw.ar(freq * 2 * vibrato) * 0.15
    ]);
    sig = RLPF.ar(sig + breath, freq * 4, 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 66. Alto Sax - Mid-range saxophone
SynthDef(\altoSax, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato, breath;
    env = EnvGen.kr(Env.asr(0.06, 1, 0.12), gate, doneAction: 2);
    vibrato = SinOsc.kr(5).range(0.997, 1.003);
    breath = LPF.ar(WhiteNoise.ar(0.12), freq * 2);
    sig = Mix([
        Pulse.ar(freq * vibrato, 0.45) * 0.5,
        Saw.ar(freq * vibrato) * 0.35,
        Saw.ar(freq * 2 * vibrato) * 0.15
    ]);
    sig = RLPF.ar(sig + breath, freq * 3.5, 0.35);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 67. Tenor Sax - Lower saxophone
SynthDef(\tenorSax, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato, breath;
    env = EnvGen.kr(Env.asr(0.08, 1, 0.15), gate, doneAction: 2);
    vibrato = SinOsc.kr(4.5).range(0.998, 1.002);
    breath = LPF.ar(WhiteNoise.ar(0.15), freq * 2);
    sig = Mix([
        Pulse.ar(freq * vibrato, 0.5) * 0.55,
        Saw.ar(freq * vibrato) * 0.3,
        Saw.ar(freq * 2 * vibrato) * 0.12
    ]);
    sig = RLPF.ar(sig + breath, freq * 3, 0.4);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 68. Baritone Sax - Deep saxophone
SynthDef(\baritoneSax, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato, breath;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);
    vibrato = SinOsc.kr(4).range(0.998, 1.002);
    breath = LPF.ar(WhiteNoise.ar(0.18), freq * 2);
    sig = Mix([
        Pulse.ar(freq * vibrato, 0.55) * 0.6,
        Saw.ar(freq * vibrato) * 0.25,
        Saw.ar(freq * 2 * vibrato) * 0.1
    ]);
    sig = RLPF.ar(sig + breath, freq * 2.5, 0.45);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 69. Oboe - Double reed woodwind
SynthDef(\oboe, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.08, 1, 0.15), gate, doneAction: 2);
    vibrato = SinOsc.kr(5).range(0.998, 1.002);
    // Nasal, reedy tone
    sig = Mix([
        Pulse.ar(freq * vibrato, 0.3) * 0.5,
        Saw.ar(freq * vibrato) * 0.3,
        Saw.ar(freq * 2 * vibrato) * 0.15,
        Saw.ar(freq * 3 * vibrato) * 0.08
    ]);
    sig = BPF.ar(sig, freq * 2.5, 0.3) + (LPF.ar(sig, freq * 3) * 0.4);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 70. English Horn - Alto oboe
SynthDef(\englishHorn, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);
    vibrato = SinOsc.kr(4.5).range(0.998, 1.002);
    sig = Mix([
        Pulse.ar(freq * vibrato, 0.35) * 0.5,
        Saw.ar(freq * vibrato) * 0.35,
        Saw.ar(freq * 2 * vibrato) * 0.12
    ]);
    sig = BPF.ar(sig, freq * 2, 0.35) + (LPF.ar(sig, freq * 2.5) * 0.4);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 71. Bassoon - Deep double reed
SynthDef(\bassoon, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);
    sig = Mix([
        Pulse.ar(freq, 0.4) * 0.6,
        Saw.ar(freq) * 0.25,
        Saw.ar(freq * 2) * 0.1
    ]);
    sig = RLPF.ar(sig, freq * 2, 0.5);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 72. Clarinet - Single reed woodwind
SynthDef(\clarinet, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.05, 1, 0.1), gate, doneAction: 2);
    vibrato = SinOsc.kr(5).range(0.998, 1.002);
    // Clarinet emphasizes odd harmonics
    sig = Mix([
        Pulse.ar(freq * vibrato, 0.5) * 0.6,
        SinOsc.ar(freq * 3 * vibrato) * 0.25,
        SinOsc.ar(freq * 5 * vibrato) * 0.12
    ]);
    sig = LPF.ar(sig, freq * 4);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// PIPE (GM 73-80)
// ============================================================================

// 73. Piccolo - High flute
SynthDef(\piccolo, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato, breath;
    env = EnvGen.kr(Env.asr(0.03, 1, 0.08), gate, doneAction: 2);
    vibrato = SinOsc.kr(6).range(0.997, 1.003);
    breath = HPF.ar(WhiteNoise.ar(0.08), freq * 2);
    sig = Mix([
        SinOsc.ar(freq * vibrato) * 0.6,
        SinOsc.ar(freq * 2 * vibrato) * 0.25,
        SinOsc.ar(freq * 3 * vibrato) * 0.12
    ]);
    sig = (sig + breath) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 74. Flute - Concert flute
SynthDef(\flute, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato, breath;
    env = EnvGen.kr(Env.asr(0.05, 1, 0.1), gate, doneAction: 2);
    vibrato = SinOsc.kr(5).range(0.998, 1.002);
    breath = HPF.ar(WhiteNoise.ar(0.1), freq);
    sig = Mix([
        SinOsc.ar(freq * vibrato) * 0.6,
        SinOsc.ar(freq * 2 * vibrato) * 0.2,
        SinOsc.ar(freq * 3 * vibrato) * 0.1
    ]);
    sig = (sig + breath) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 75. Recorder - Wooden flute
SynthDef(\recorder, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, breath;
    env = EnvGen.kr(Env.asr(0.04, 1, 0.1), gate, doneAction: 2);
    breath = HPF.ar(WhiteNoise.ar(0.12), freq * 0.8);
    sig = Mix([
        SinOsc.ar(freq) * 0.7,
        SinOsc.ar(freq * 2) * 0.2,
        SinOsc.ar(freq * 3) * 0.08
    ]);
    sig = (sig + breath) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 76. Pan Flute - Breathy pan pipes
SynthDef(\panFlute, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato, breath;
    env = EnvGen.kr(Env.asr(0.08, 1, 0.15), gate, doneAction: 2);
    vibrato = SinOsc.kr(4).range(0.998, 1.002);
    breath = HPF.ar(WhiteNoise.ar(0.15), freq * 0.5);
    sig = Mix([
        SinOsc.ar(freq * vibrato) * 0.5,
        SinOsc.ar(freq * 2 * vibrato) * 0.15
    ]);
    sig = (sig + breath) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 77. Blown Bottle - Bottle resonance
SynthDef(\blownBottle, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, breath;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);
    breath = BPF.ar(WhiteNoise.ar(0.2), freq, 0.1);
    sig = SinOsc.ar(freq) * 0.6;
    sig = (sig + breath) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 78. Shakuhachi - Japanese bamboo flute
SynthDef(\shakuhachi, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato, breath;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);
    vibrato = SinOsc.kr(4).range(0.997, 1.003);
    breath = HPF.ar(WhiteNoise.ar(0.18), freq * 0.7);
    sig = Mix([
        SinOsc.ar(freq * vibrato) * 0.5,
        SinOsc.ar(freq * 2 * vibrato) * 0.15
    ]);
    sig = (sig + breath) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 79. Whistle - Simple whistle
SynthDef(\whistle, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.02, 1, 0.05), gate, doneAction: 2);
    vibrato = SinOsc.kr(6).range(0.998, 1.002);
    sig = SinOsc.ar(freq * vibrato);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 80. Ocarina - Clay flute
SynthDef(\ocarina, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato, breath;
    env = EnvGen.kr(Env.asr(0.05, 1, 0.1), gate, doneAction: 2);
    vibrato = SinOsc.kr(4.5).range(0.998, 1.002);
    breath = HPF.ar(WhiteNoise.ar(0.1), freq);
    sig = Mix([
        SinOsc.ar(freq * vibrato) * 0.65,
        SinOsc.ar(freq * 2 * vibrato) * 0.18
    ]);
    sig = (sig + breath) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// SYNTH LEAD (GM 81-88)
// ============================================================================

// 81. Lead 1 (Square) - Square wave lead
SynthDef(\lead1Square, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, filterEnv, sig;
    env = EnvGen.kr(Env.adsr(0.01, 0.3, 0.6, 0.2), gate, doneAction: 2);
    filterEnv = EnvGen.kr(Env.adsr(0.01, 0.4, 0.3, 0.3));
    sig = Pulse.ar(freq, 0.5);
    sig = RLPF.ar(sig, (freq * 4 * filterEnv) + (freq * 2), 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 82. Lead 2 (Sawtooth) - Sawtooth lead (Detuned supersaw for thickness)
SynthDef(\lead2Sawtooth, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, filterEnv, sig;
    env = EnvGen.kr(Env.adsr(0.01, 0.3, 0.6, 0.2), gate, doneAction: 2);
    filterEnv = EnvGen.kr(Env.adsr(0.01, 0.5, 0.3, 0.3));

    // Detuned sawtooths for fat lead sound
    sig = Mix([
        Saw.ar(freq * 0.998) * 0.25,
        Saw.ar(freq) * 0.3,
        Saw.ar(freq * 1.002) * 0.25,
        Saw.ar(freq * 2) * 0.1  // Octave for brightness
    ]);

    sig = RLPF.ar(sig, (freq * 5 * filterEnv) + (freq * 2), 0.25);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 83. Lead 3 (Calliope) - Steam organ lead
SynthDef(\lead3Calliope, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.02, 1, 0.1), gate, doneAction: 2);
    vibrato = SinOsc.kr(6).range(0.995, 1.005);
    sig = Mix([
        Pulse.ar(freq * vibrato, 0.5) * 0.5,
        Pulse.ar(freq * 2 * vibrato, 0.5) * 0.3,
        Pulse.ar(freq * 4 * vibrato, 0.5) * 0.2
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 84. Lead 4 (Chiff) - Synth lead with attack
SynthDef(\lead4Chiff, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, filterEnv, sig, chiff;
    env = EnvGen.kr(Env.adsr(0.005, 0.3, 0.6, 0.2), gate, doneAction: 2);
    filterEnv = EnvGen.kr(Env.adsr(0.005, 0.4, 0.3, 0.3));
    chiff = EnvGen.kr(Env.perc(0.001, 0.02)) * WhiteNoise.ar(0.3);
    sig = Saw.ar(freq);
    sig = RLPF.ar(sig, (freq * 6 * filterEnv) + (freq * 2), 0.2);
    sig = (sig + chiff) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 85. Lead 5 (Charang) - Distorted lead
SynthDef(\lead5Charang, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, filterEnv, sig;
    env = EnvGen.kr(Env.adsr(0.01, 0.3, 0.6, 0.2), gate, doneAction: 2);
    filterEnv = EnvGen.kr(Env.adsr(0.01, 0.4, 0.4, 0.3));
    sig = Mix([
        Saw.ar(freq) * 0.6,
        Pulse.ar(freq, 0.3) * 0.4
    ]);
    sig = RLPF.ar(sig, (freq * 4 * filterEnv) + (freq * 2), 0.2);
    sig = (sig * 2).distort;
    sig = sig * env * amp * velocity * 0.7;
    Out.ar(out, [sig, sig]);
}).add;

// 86. Lead 6 (Voice) - Vocal-like lead
SynthDef(\lead6Voice, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.adsr(0.05, 0.3, 0.6, 0.2), gate, doneAction: 2);
    vibrato = SinOsc.kr(5.5).range(0.997, 1.003);
    sig = Mix([
        Pulse.ar(freq * vibrato, 0.3) * 0.5,
        Pulse.ar(freq * 2 * vibrato, 0.4) * 0.3,
        Saw.ar(freq * vibrato) * 0.2
    ]);
    sig = BPF.ar(sig, freq * 3, 0.4) + (LPF.ar(sig, freq * 4) * 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 87. Lead 7 (Fifths) - Lead with fifth harmony (Detuned for richness)
SynthDef(\lead7Fifths, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, filterEnv, sig;
    env = EnvGen.kr(Env.adsr(0.01, 0.3, 0.6, 0.2), gate, doneAction: 2);
    filterEnv = EnvGen.kr(Env.adsr(0.01, 0.4, 0.3, 0.3));

    // Detuned root and fifth for thick harmony
    sig = Mix([
        Saw.ar(freq * 0.999) * 0.22,
        Saw.ar(freq) * 0.25,
        Saw.ar(freq * 1.001) * 0.22,
        Saw.ar(freq * 1.5 * 0.999) * 0.15,  // Perfect fifth (detuned)
        Saw.ar(freq * 1.5) * 0.16           // Perfect fifth
    ]);

    sig = RLPF.ar(sig, (freq * 4 * filterEnv) + (freq * 2), 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 88. Lead 8 (Bass + Lead) - Fat bass and lead (Detuned layers)
SynthDef(\lead8BassLead, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, filterEnv, sig, bass, lead;
    env = EnvGen.kr(Env.adsr(0.01, 0.3, 0.6, 0.2), gate, doneAction: 2);
    filterEnv = EnvGen.kr(Env.adsr(0.01, 0.4, 0.3, 0.3));

    // Fat detuned bass layer
    bass = Mix([
        Saw.ar(freq * 0.5 * 0.999) * 0.2,
        Saw.ar(freq * 0.5) * 0.22,
        Saw.ar(freq * 0.5 * 1.001) * 0.2
    ]);

    // Detuned lead layer
    lead = Mix([
        Saw.ar(freq * 0.998) * 0.18,
        Saw.ar(freq) * 0.2,
        Saw.ar(freq * 1.002) * 0.18
    ]);

    sig = bass + lead;
    sig = RLPF.ar(sig, (freq * 4 * filterEnv) + (freq * 2), 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// SYNTH PAD (GM 89-96)
// ============================================================================

// 89. Pad 1 (New Age) - Warm, ethereal pad (Additive synthesis + chorus)
SynthDef(\pad1NewAge, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, left, right;
    env = EnvGen.kr(Env.asr(0.5, 1, 1.0), gate, doneAction: 2);

    // Additive synthesis: multiple sine waves for smooth, ethereal sound
    sig = Mix([
        SinOsc.ar(freq * 0.997) * 0.12,
        SinOsc.ar(freq * 0.999) * 0.13,
        SinOsc.ar(freq) * 0.15,
        SinOsc.ar(freq * 1.001) * 0.13,
        SinOsc.ar(freq * 1.003) * 0.12,
        SinOsc.ar(freq * 2) * 0.1,
        SinOsc.ar(freq * 3) * 0.08,
        SinOsc.ar(freq * 4) * 0.05,
        SinOsc.ar(freq * 5) * 0.03
    ]);

    // Gentle filtering
    sig = LPF.ar(sig, freq * 4);

    // Wide stereo chorus for ethereal quality
    left = DelayC.ar(sig, 0.1, LFNoise1.kr(0.3).range(0.02, 0.04));
    right = DelayC.ar(sig, 0.1, LFNoise1.kr(0.35).range(0.02, 0.04));

    sig = [left, right] * env * amp * velocity * 0.8;
    Out.ar(out, sig);
}).add;

// 90. Pad 2 (Warm) - Soft, warm pad (Detuned pulses + slow LFO)
SynthDef(\pad2Warm, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pwm, left, right;
    env = EnvGen.kr(Env.asr(0.4, 1, 0.8), gate, doneAction: 2);

    // Slow PWM for warmth and movement
    pwm = SinOsc.kr(0.2).range(0.3, 0.7);

    // Multiple detuned pulse waves
    sig = Mix([
        Pulse.ar(freq * 0.997, pwm) * 0.18,
        Pulse.ar(freq * 0.999, pwm + 0.1) * 0.19,
        Pulse.ar(freq, pwm) * 0.2,
        Pulse.ar(freq * 1.001, pwm - 0.1) * 0.19,
        Pulse.ar(freq * 1.003, pwm) * 0.18,
        SinOsc.ar(freq) * 0.15
    ]);

    // Warm low-pass filtering
    sig = LPF.ar(sig, freq * 3);

    // Subtle stereo widening
    left = DelayC.ar(sig, 0.05, LFNoise1.kr(0.4).range(0.015, 0.025));
    right = DelayC.ar(sig, 0.05, LFNoise1.kr(0.45).range(0.015, 0.025));

    sig = [left, right] * env * amp * velocity * 0.75;
    Out.ar(out, sig);
}).add;

// 91. Pad 3 (Polysynth) - Bright poly pad
SynthDef(\pad3Polysynth, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.3, 1, 0.6), gate, doneAction: 2);
    sig = Mix([
        Saw.ar(freq * 0.996) * 0.15,
        Saw.ar(freq * 0.998) * 0.15,
        Saw.ar(freq) * 0.2,
        Saw.ar(freq * 1.002) * 0.15,
        Saw.ar(freq * 1.004) * 0.15,
        Pulse.ar(freq, 0.3) * 0.15
    ]);
    sig = RLPF.ar(sig, freq * 4, 0.4);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 92. Pad 4 (Choir) - Vocal pad
SynthDef(\pad4Choir, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.6, 1, 1.2), gate, doneAction: 2);
    vibrato = SinOsc.kr(4).range(0.998, 1.002);
    sig = Mix([
        Saw.ar(freq * 0.997 * vibrato) * 0.15,
        Saw.ar(freq * 0.999 * vibrato) * 0.15,
        Saw.ar(freq * vibrato) * 0.2,
        Saw.ar(freq * 1.001 * vibrato) * 0.15,
        Saw.ar(freq * 1.003 * vibrato) * 0.15
    ]);
    sig = BPF.ar(sig, 800, 0.5) + BPF.ar(sig, 1200, 0.5) + (LPF.ar(sig, 2000) * 0.2);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 93. Pad 5 (Bowed) - Bowed glass pad
SynthDef(\pad5Bowed, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.8, 1, 1.5), gate, doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq * 0.998) * 0.2,
        SinOsc.ar(freq) * 0.25,
        SinOsc.ar(freq * 1.002) * 0.2,
        SinOsc.ar(freq * 2) * 0.15,
        SinOsc.ar(freq * 3) * 0.1
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 94. Pad 6 (Metallic) - Metallic pad
SynthDef(\pad6Metallic, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, modulator, carrier;
    env = EnvGen.kr(Env.asr(0.4, 1, 0.8), gate, doneAction: 2);
    modulator = SinOsc.ar(freq * 3.5) * (freq * 0.8);
    carrier = SinOsc.ar(freq + modulator);
    sig = Mix([
        carrier * 0.5,
        SinOsc.ar(freq * 0.999) * 0.25,
        SinOsc.ar(freq * 1.001) * 0.25
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 95. Pad 7 (Halo) - Bright halo pad
SynthDef(\pad7Halo, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.6, 1, 1.0), gate, doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq * 0.997) * 0.15,
        SinOsc.ar(freq * 0.999) * 0.15,
        SinOsc.ar(freq) * 0.2,
        SinOsc.ar(freq * 1.001) * 0.15,
        SinOsc.ar(freq * 1.003) * 0.15,
        SinOsc.ar(freq * 2) * 0.12,
        SinOsc.ar(freq * 4) * 0.08
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 96. Pad 8 (Sweep) - Sweeping pad
SynthDef(\pad8Sweep, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, filterEnv, sig;
    env = EnvGen.kr(Env.asr(0.5, 1, 1.0), gate, doneAction: 2);
    filterEnv = EnvGen.kr(Env.asr(2.0, 0.8, 2.0));
    sig = Mix([
        Saw.ar(freq * 0.998) * 0.2,
        Saw.ar(freq) * 0.25,
        Saw.ar(freq * 1.002) * 0.2,
        Pulse.ar(freq, 0.5) * 0.2
    ]);
    sig = RLPF.ar(sig, (freq * 6 * filterEnv) + (freq * 1.5), 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// SYNTH FX (GM 97-104)
// ============================================================================

// 97. FX 1 (Rain) - Rain effect
SynthDef(\fx1Rain, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.3, 1, 0.5), gate, doneAction: 2);
    sig = HPF.ar(WhiteNoise.ar(0.3), freq);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 98. FX 2 (Soundtrack) - Cinematic pad
SynthDef(\fx2Soundtrack, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.asr(1.0, 1, 1.5), gate, doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq * 0.996) * 0.15,
        SinOsc.ar(freq * 0.998) * 0.15,
        SinOsc.ar(freq) * 0.2,
        SinOsc.ar(freq * 1.002) * 0.15,
        SinOsc.ar(freq * 1.004) * 0.15,
        SinOsc.ar(freq * 2.5) * 0.1
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 99. FX 3 (Crystal) - Crystalline sound
SynthDef(\fx3Crystal, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, 2.0, 1, -2), gate, doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq) * 0.4,
        SinOsc.ar(freq * 2.76) * 0.25,
        SinOsc.ar(freq * 5.4) * 0.15,
        SinOsc.ar(freq * 8.93) * 0.1,
        SinOsc.ar(freq * 13.2) * 0.05
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 100. FX 4 (Atmosphere) - Atmospheric pad
SynthDef(\fx4Atmosphere, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, lfo;
    env = EnvGen.kr(Env.asr(1.5, 1, 2.0), gate, doneAction: 2);
    lfo = SinOsc.kr(0.2).range(0.5, 1.0);
    sig = Mix([
        Saw.ar(freq * 0.995) * 0.15,
        Saw.ar(freq * 0.998) * 0.15,
        Saw.ar(freq) * 0.2,
        Saw.ar(freq * 1.002) * 0.15,
        Saw.ar(freq * 1.005) * 0.15
    ]);
    sig = LPF.ar(sig, freq * 2 * lfo);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 101. FX 5 (Brightness) - Bright sparkle
SynthDef(\fx5Brightness, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, 1.5, 1, -3), gate, doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq) * 0.3,
        SinOsc.ar(freq * 2) * 0.25,
        SinOsc.ar(freq * 4) * 0.2,
        SinOsc.ar(freq * 8) * 0.15,
        SinOsc.ar(freq * 16) * 0.1
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 102. FX 6 (Goblins) - Eerie, modulated sound
SynthDef(\fx6Goblins, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, lfo;
    env = EnvGen.kr(Env.asr(0.5, 1, 0.8), gate, doneAction: 2);
    lfo = SinOsc.kr(0.5).range(0.8, 1.2);
    sig = Mix([
        Pulse.ar(freq * lfo, 0.3) * 0.4,
        Saw.ar(freq * 0.5 * lfo) * 0.3,
        SinOsc.ar(freq * 2 * lfo) * 0.2
    ]);
    sig = RLPF.ar(sig, freq * 3 * lfo, 0.4);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 103. FX 7 (Echoes) - Echo pad
SynthDef(\fx7Echoes, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, echo;
    env = EnvGen.kr(Env.asr(0.3, 1, 1.0), gate, doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq) * 0.5,
        SinOsc.ar(freq * 2) * 0.25
    ]);
    echo = sig + DelayN.ar(sig, 0.5, 0.25, 0.5) + DelayN.ar(sig, 1.0, 0.5, 0.3);
    sig = echo * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 104. FX 8 (Sci-Fi) - Science fiction sound
SynthDef(\fx8SciFi, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, modulator, carrier, lfo;
    env = EnvGen.kr(Env.asr(0.4, 1, 0.6), gate, doneAction: 2);
    lfo = SinOsc.kr(0.3).range(0.5, 2.0);
    modulator = SinOsc.ar(freq * 4 * lfo) * (freq * lfo);
    carrier = SinOsc.ar(freq + modulator);
    sig = carrier * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// ETHNIC (GM 105-112)
// ============================================================================

// 105. Sitar - Indian plucked string
SynthDef(\sitar, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck, sympathetic;
    env = EnvGen.kr(Env.perc(0.001, 2.0, 1, -3), gate, doneAction: 2);
    // Main plucked string
    pluck = Pluck.ar(
        WhiteNoise.ar(0.15),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        15,
        coef: 0.4
    );
    // Sympathetic resonance
    sympathetic = Mix([
        BPF.ar(pluck, freq * 2, 0.1) * 0.3,
        BPF.ar(pluck, freq * 3, 0.1) * 0.2,
        BPF.ar(pluck, freq * 4, 0.1) * 0.15
    ]);
    sig = (pluck + sympathetic) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 106. Banjo - American plucked string
SynthDef(\banjo, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 0.8, 1, -5), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.2),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        8,
        coef: 0.3
    );
    sig = RLPF.ar(pluck, freq * 5, 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 107. Shamisen - Japanese plucked string
SynthDef(\shamisen, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 1.2, 1, -4), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.18),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        10,
        coef: 0.35
    );
    sig = BPF.ar(pluck, freq * 2, 0.4) + (pluck * 0.6);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 108. Koto - Japanese zither
SynthDef(\koto, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 2.5, 1, -3), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.12),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        12,
        coef: 0.5
    );
    sig = pluck * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 109. Kalimba - African thumb piano
SynthDef(\kalimba, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pluck;
    env = EnvGen.kr(Env.perc(0.001, 1.5, 1, -4), gate, doneAction: 2);
    pluck = Pluck.ar(
        WhiteNoise.ar(0.1),
        Impulse.kr(0),
        freq.reciprocal,
        freq.reciprocal,
        10,
        coef: 0.6
    );
    sig = Mix([
        pluck * 0.7,
        SinOsc.ar(freq) * 0.3
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 110. Bagpipe - Scottish bagpipe
SynthDef(\bagpipe, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, drone;
    env = EnvGen.kr(Env.asr(0.2, 1, 0.3), gate, doneAction: 2);
    // Chanter (melody pipe)
    sig = Mix([
        Pulse.ar(freq, 0.4) * 0.5,
        Saw.ar(freq) * 0.3
    ]);
    // Drone pipes
    drone = Mix([
        Pulse.ar(freq * 0.5, 0.5) * 0.15,
        Pulse.ar(freq * 0.75, 0.5) * 0.1
    ]);
    sig = (sig + drone) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 111. Fiddle - Folk violin
SynthDef(\fiddle, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.08, 1, 0.15), gate, doneAction: 2);
    vibrato = SinOsc.kr(6).range(0.995, 1.005);
    sig = Mix([
        Saw.ar(freq * vibrato) * 0.5,
        Saw.ar(freq * 2 * vibrato) * 0.25,
        Saw.ar(freq * 3 * vibrato) * 0.15
    ]);
    sig = RLPF.ar(sig, freq * 4, 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 112. Shanai - Indian oboe
SynthDef(\shanai, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, vibrato;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);
    vibrato = SinOsc.kr(5.5).range(0.995, 1.005);
    sig = Mix([
        Pulse.ar(freq * vibrato, 0.3) * 0.5,
        Saw.ar(freq * vibrato) * 0.3,
        Saw.ar(freq * 2 * vibrato) * 0.15
    ]);
    sig = BPF.ar(sig, freq * 2.5, 0.3) + (LPF.ar(sig, freq * 3) * 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// PERCUSSIVE (GM 113-120)
// ============================================================================

// 113. Tinkle Bell - Small bell
SynthDef(\tinkleBell, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, 0.8, 1, -4), gate, doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq) * 0.5,
        SinOsc.ar(freq * 3.2) * 0.3,
        SinOsc.ar(freq * 6.1) * 0.15,
        SinOsc.ar(freq * 9.8) * 0.08
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 114. Agogo - Metal percussion
SynthDef(\agogo, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, modulator, carrier;
    env = EnvGen.kr(Env.perc(0.001, 0.6, 1, -5), gate, doneAction: 2);
    modulator = SinOsc.ar(freq * 2) * (freq * 0.5);
    carrier = SinOsc.ar(freq + modulator);
    sig = carrier * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 115. Steel Drums - Caribbean steel pan
SynthDef(\steelDrums, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, modulator, carrier;
    env = EnvGen.kr(Env.perc(0.001, 1.5, 1, -3), gate, doneAction: 2);
    modulator = SinOsc.ar(freq * 1.4) * (freq * 0.6);
    carrier = SinOsc.ar(freq + modulator);
    sig = Mix([
        carrier * 0.6,
        SinOsc.ar(freq * 2) * 0.25,
        SinOsc.ar(freq * 3) * 0.12
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 116. Woodblock - Wooden percussion
SynthDef(\woodblockMelodic, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, 0.15, 1, -8), gate, doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq) * 0.6,
        SinOsc.ar(freq * 2.5) * 0.3,
        HPF.ar(WhiteNoise.ar(0.2), freq * 2) * 0.2
    ]);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 117. Taiko Drum - Japanese drum
SynthDef(\taikoDrum, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, pitchEnv, sig;
    env = EnvGen.kr(Env.perc(0.001, 1.0, 1, -3), gate, doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.08, 1.5, -8));
    sig = SinOsc.ar(freq * pitchEnv);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 118. Melodic Tom - Tuned tom drum
SynthDef(\melodicTom, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, pitchEnv, sig;
    env = EnvGen.kr(Env.perc(0.001, 0.8, 1, -4), gate, doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.05, 1.3, -8));
    sig = SinOsc.ar(freq * pitchEnv);
    sig = RLPF.ar(sig, freq * 2, 0.5);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 119. Synth Drum - Electronic drum
SynthDef(\synthDrum, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, pitchEnv, sig, noise;
    env = EnvGen.kr(Env.perc(0.001, 0.5, 1, -5), gate, doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.04, 2.0, -10));
    sig = SinOsc.ar(freq * pitchEnv);
    noise = HPF.ar(WhiteNoise.ar(0.2), freq) * EnvGen.kr(Env.perc(0.001, 0.1));
    sig = (sig + noise) * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 120. Reverse Cymbal - Reversed cymbal effect
SynthDef(\reverseCymbal, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.new([0, 1], [1.5], [4]), gate, doneAction: 2);
    sig = BPF.ar(WhiteNoise.ar(0.5), freq * 4, 0.3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// SOUND FX (GM 121-128)
// ============================================================================

// 121. Guitar Fret Noise - Fret slide sound
SynthDef(\guitarFretNoise, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, pitchGlide;
    env = EnvGen.kr(Env.perc(0.001, 0.3, 1, -6), gate, doneAction: 2);
    pitchGlide = EnvGen.kr(Env.new([freq * 0.5, freq], [0.2], [3]));
    sig = HPF.ar(WhiteNoise.ar(0.4), pitchGlide);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 122. Breath Noise - Breath sound
SynthDef(\breathNoise, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.1, 1, 0.2), gate, doneAction: 2);
    sig = LPF.ar(WhiteNoise.ar(0.3), freq * 2);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 123. Seashore - Ocean waves
SynthDef(\seashore, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, lfo;
    env = EnvGen.kr(Env.asr(1.0, 1, 1.5), gate, doneAction: 2);
    lfo = SinOsc.kr(0.1).range(0.3, 1.0);
    sig = LPF.ar(WhiteNoise.ar(0.4), freq) * lfo;
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 124. Bird Tweet - Bird chirping
SynthDef(\birdTweet, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, chirp;
    env = EnvGen.kr(Env.perc(0.001, 0.15, 1, -6), gate, doneAction: 2);
    chirp = EnvGen.kr(Env.new([freq * 2, freq * 3, freq * 2.5], [0.05, 0.05], [3, -3]));
    sig = SinOsc.ar(chirp);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 125. Telephone Ring - Phone ringing
SynthDef(\telephoneRing, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, ring;
    env = EnvGen.kr(Env.asr(0.01, 1, 0.05), gate, doneAction: 2);
    ring = SinOsc.kr(20).range(0, 1);
    sig = Mix([
        SinOsc.ar(freq) * 0.5,
        SinOsc.ar(freq * 1.5) * 0.5
    ]) * ring;
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 126. Helicopter - Helicopter sound
SynthDef(\helicopter, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig, rotor;
    env = EnvGen.kr(Env.asr(0.5, 1, 0.8), gate, doneAction: 2);
    rotor = Impulse.ar(freq * 0.1);
    sig = LPF.ar(rotor + (WhiteNoise.ar(0.3) * rotor), freq);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 127. Applause - Crowd applause
SynthDef(\applause, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.asr(0.3, 1, 0.5), gate, doneAction: 2);
    sig = LPF.ar(WhiteNoise.ar(0.5), freq * 3);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

// 128. Gunshot - Gun firing
SynthDef(\gunshot, { |out=0, freq=440, amp=0.5, gate=1, velocity=0.8|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.0001, 0.2, 1, -8), gate, doneAction: 2);
    sig = HPF.ar(WhiteNoise.ar(0.8), freq);
    sig = sig * env * amp * velocity;
    Out.ar(out, [sig, sig]);
}).add;

"".postln;
"✅✅✅ ALL MELODIC INSTRUMENTS LOADED - PHASE 1+2+3 COMPLETE! ✅✅✅".postln;
"".postln;
"═══════════════════════════════════════════════════════════════════════════".postln;
"   PHASE 1 - Piano, Chromatic Percussion, Organ, Guitar (32 instruments)".postln;
"═══════════════════════════════════════════════════════════════════════════".postln;
"   PIANO (8): acousticGrandPiano, brightAcousticPiano, electricGrandPiano, honkyTonkPiano,".postln;
"             electricPiano1, electricPiano2, harpsichord, clavinet".postln;
"   CHROMATIC PERCUSSION (8): celesta, glockenspiel, musicBox, vibraphone,".postln;
"                             marimba, xylophone, tubularBells, dulcimer".postln;
"   ORGAN (8): drawbarOrgan, percussiveOrgan, rockOrgan, churchOrgan,".postln;
"             reedOrgan, accordion, harmonica, bandoneon".postln;
"   GUITAR (8): acousticGuitarNylon, acousticGuitarSteel, electricGuitarJazz, electricGuitarClean,".postln;
"              electricGuitarMuted, overdrivenGuitar, distortionGuitar, guitarHarmonics".postln;
"".postln;
"═══════════════════════════════════════════════════════════════════════════".postln;
"   PHASE 2 - Bass, Strings, Ensemble, Brass (32 instruments)".postln;
"═══════════════════════════════════════════════════════════════════════════".postln;
"   BASS (8): acousticBass, electricBassFinger, electricBassPick, fretlessBass,".postln;
"            slapBass1, slapBass2, synthBass1, synthBass2".postln;
"   STRINGS (8): violin, viola, cello, contrabass, tremoloStrings,".postln;
"               pizzicatoStrings, orchestralHarp, timpani".postln;
"   ENSEMBLE (8): stringEnsemble1, stringEnsemble2, synthStrings1, synthStrings2,".postln;
"                choirAahs, voiceOohs, synthVoice, orchestraHit".postln;
"   BRASS (8): trumpet, trombone, tuba, mutedTrumpet, frenchHorn,".postln;
"             brassSection, synthBrass1, synthBrass2".postln;
"".postln;
"═══════════════════════════════════════════════════════════════════════════".postln;
"   PHASE 3 - Reed, Pipe, Synth Lead, Synth Pad, Synth FX, Ethnic, Percussive, Sound FX (64 instruments)".postln;
"═══════════════════════════════════════════════════════════════════════════".postln;
"   REED (8): sopranoSax, altoSax, tenorSax, baritoneSax, oboe, englishHorn, bassoon, clarinet".postln;
"   PIPE (8): piccolo, flute, recorder, panFlute, blownBottle, shakuhachi, whistle, ocarina".postln;
"   SYNTH LEAD (8): lead1Square, lead2Sawtooth, lead3Calliope, lead4Chiff,".postln;
"                   lead5Charang, lead6Voice, lead7Fifths, lead8BassLead".postln;
"   SYNTH PAD (8): pad1NewAge, pad2Warm, pad3Polysynth, pad4Choir,".postln;
"                  pad5Bowed, pad6Metallic, pad7Halo, pad8Sweep".postln;
"   SYNTH FX (8): fx1Rain, fx2Soundtrack, fx3Crystal, fx4Atmosphere,".postln;
"                 fx5Brightness, fx6Goblins, fx7Echoes, fx8SciFi".postln;
"   ETHNIC (8): sitar, banjo, shamisen, koto, kalimba, bagpipe, fiddle, shanai".postln;
"   PERCUSSIVE (8): tinkleBell, agogo, steelDrums, woodblockMelodic, taikoDrum,".postln;
"                   melodicTom, synthDrum, reverseCymbal".postln;
"   SOUND FX (8): guitarFretNoise, breathNoise, seashore, birdTweet,".postln;
"                 telephoneRing, helicopter, applause, gunshot".postln;
"".postln;
"═══════════════════════════════════════════════════════════════════════════".postln;
"   TOTAL MELODIC INSTRUMENTS: 128 (Full General MIDI Standard)".postln;
"═══════════════════════════════════════════════════════════════════════════".postln;
"".postln;
)

