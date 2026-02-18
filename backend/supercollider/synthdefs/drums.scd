/*
 * Drum & Percussion SynthDefs
 * 
 * Comprehensive percussion library based on:
 * - TR-808/909 drum machine synthesis patterns
 * - General MIDI percussion map (MIDI notes 35-81)
 * - Acoustic and electronic drum sounds
 * 
 * Synthesis techniques:
 * - Filtered noise (snares, hi-hats, cymbals)
 * - Sine sweeps with pitch envelopes (kicks, toms)
 * - FM synthesis (metallic percussion)
 * - Resonant filters (emphasis and character)
 */

(
// ============================================================================
// KICK DRUMS
// ============================================================================

// TR-808 Style Kick - Classic analog kick with pitch envelope
SynthDef(\kick808, { |out=0, amp=0.8, freq=60, decay=0.4, pitchRatio=2.5|
    var env, pitchEnv, sig;
    // Amplitude envelope - punchy attack, exponential decay
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    // Pitch envelope - sweeps from high to low for punch
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.1, pitchRatio, -8));
    // Sine wave with pitch envelope
    sig = SinOsc.ar(freq * pitchEnv);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-909 Style Kick - Punchier, more attack
SynthDef(\kick909, { |out=0, amp=0.8, freq=55, decay=0.35, pitchRatio=3.0, click=0.3|
    var env, pitchEnv, sig, clickEnv, clickSig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.08, pitchRatio, -10));
    sig = SinOsc.ar(freq * pitchEnv);
    // Add click/beater sound
    clickEnv = EnvGen.kr(Env.perc(0.0001, 0.01));
    clickSig = HPF.ar(WhiteNoise.ar(click), 2000) * clickEnv;
    sig = (sig + clickSig) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Acoustic Kick - Deeper, more natural
SynthDef(\kickAcoustic, { |out=0, amp=0.8, freq=50, decay=0.5, tone=0.3|
    var env, pitchEnv, sig, toneSig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.15, 2.0, -6));
    sig = SinOsc.ar(freq * pitchEnv);
    // Add tonal component
    toneSig = SinOsc.ar(freq * 2) * tone;
    sig = (sig + toneSig) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// SNARE DRUMS
// ============================================================================

// TR-808 Style Snare - Filtered noise + tone
SynthDef(\snare808, { |out=0, amp=0.6, freq=200, decay=0.15, noiseDecay=0.2, tone=0.5|
    var env, noiseEnv, sig, noise;
    // Tonal component envelope
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    // Noise component envelope (longer)
    noiseEnv = EnvGen.kr(Env.perc(0.001, noiseDecay, 1, -4));
    // Tonal component - two sine waves
    sig = (SinOsc.ar(freq) + SinOsc.ar(freq * 1.6)) * 0.5 * tone;
    // Noise component - high-pass filtered
    noise = HPF.ar(WhiteNoise.ar(1), 1000);
    noise = BPF.ar(noise, 2000, 1.5);
    sig = ((sig * env) + (noise * noiseEnv)) * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-909 Style Snare - Brighter, more snap
SynthDef(\snare909, { |out=0, amp=0.6, freq=180, decay=0.12, noiseDecay=0.18, snap=0.4|
    var env, noiseEnv, sig, noise, snapEnv, snapSig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -6), doneAction: 2);
    noiseEnv = EnvGen.kr(Env.perc(0.001, noiseDecay, 1, -4));
    sig = (SinOsc.ar(freq) + SinOsc.ar(freq * 1.8)) * 0.5;
    noise = HPF.ar(WhiteNoise.ar(1), 1500);
    noise = BPF.ar(noise, 3000, 1.2);
    // Add snap/crack
    snapEnv = EnvGen.kr(Env.perc(0.0001, 0.02));
    snapSig = HPF.ar(WhiteNoise.ar(snap), 5000) * snapEnv;
    sig = ((sig * env) + (noise * noiseEnv) + snapSig) * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Acoustic Snare - Natural drum sound
SynthDef(\snareAcoustic, { |out=0, amp=0.6, freq=220, decay=0.2, noiseDecay=0.25, snares=0.7|
    var env, noiseEnv, sig, noise;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    noiseEnv = EnvGen.kr(Env.perc(0.001, noiseDecay, 1, -2));
    // Drum body
    sig = (SinOsc.ar(freq) + SinOsc.ar(freq * 1.5) + SinOsc.ar(freq * 2.3)) * 0.33;
    // Snare wires - band-pass filtered noise
    noise = BPF.ar(WhiteNoise.ar(snares), 3500, 0.8);
    sig = ((sig * env) + (noise * noiseEnv)) * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// HI-HATS
// ============================================================================

// TR-808 Closed Hi-Hat
SynthDef(\hihatClosed808, { |out=0, amp=0.4, decay=0.05, tone=6000|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -8), doneAction: 2);
    // High-pass filtered noise for metallic character
    sig = HPF.ar(WhiteNoise.ar(1), tone);
    sig = BPF.ar(sig, tone * 1.5, 0.3);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-808 Open Hi-Hat
SynthDef(\hihatOpen808, { |out=0, amp=0.4, decay=0.3, tone=6000|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    sig = HPF.ar(WhiteNoise.ar(1), tone);
    sig = BPF.ar(sig, tone * 1.5, 0.3);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-909 Closed Hi-Hat - Brighter, more metallic
SynthDef(\hihatClosed909, { |out=0, amp=0.4, decay=0.04, tone=8000|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.0001, decay, 1, -10), doneAction: 2);
    sig = HPF.ar(WhiteNoise.ar(1), tone);
    sig = BPF.ar(sig, tone * 1.2, 0.2);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-909 Open Hi-Hat - Brighter, longer decay
SynthDef(\hihatOpen909, { |out=0, amp=0.4, decay=0.25, tone=8000|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.0001, decay, 1, -3), doneAction: 2);
    sig = HPF.ar(WhiteNoise.ar(1), tone);
    sig = BPF.ar(sig, tone * 1.2, 0.2);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// TOMS
// ============================================================================

// TR-808 Low Tom
SynthDef(\tomLow808, { |out=0, amp=0.7, freq=65, decay=0.3|
    var env, pitchEnv, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.1, 1.5, -6));
    sig = SinOsc.ar(freq * pitchEnv);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-808 Mid Tom
SynthDef(\tomMid808, { |out=0, amp=0.7, freq=90, decay=0.25|
    var env, pitchEnv, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.1, 1.5, -6));
    sig = SinOsc.ar(freq * pitchEnv);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-808 High Tom
SynthDef(\tomHigh808, { |out=0, amp=0.7, freq=130, decay=0.2|
    var env, pitchEnv, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.1, 1.5, -6));
    sig = SinOsc.ar(freq * pitchEnv);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// CYMBALS
// ============================================================================

// Crash Cymbal - Band-pass filtered noise
SynthDef(\cymbalCrash, { |out=0, amp=0.5, decay=1.5, tone=8000|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    // Multiple band-pass filters for metallic character
    sig = Mix([
        BPF.ar(WhiteNoise.ar(1), tone * 0.8, 0.3),
        BPF.ar(WhiteNoise.ar(1), tone * 1.2, 0.3),
        BPF.ar(WhiteNoise.ar(1), tone * 1.5, 0.3)
    ]) * 0.33;
    sig = HPF.ar(sig, 3000);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Ride Cymbal - Shorter, more defined
SynthDef(\cymbalRide, { |out=0, amp=0.4, decay=0.8, tone=6000|
    var env, sig, bell;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -2), doneAction: 2);
    sig = Mix([
        BPF.ar(WhiteNoise.ar(1), tone * 0.9, 0.2),
        BPF.ar(WhiteNoise.ar(1), tone * 1.1, 0.2)
    ]) * 0.5;
    // Add bell tone
    bell = SinOsc.ar(tone * 0.5) * 0.1;
    sig = (sig + bell) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Splash Cymbal - Bright, short
SynthDef(\cymbalSplash, { |out=0, amp=0.4, decay=0.6, tone=10000|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    sig = BPF.ar(WhiteNoise.ar(1), tone, 0.2);
    sig = HPF.ar(sig, 5000);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// CLAPS & PERCUSSION
// ============================================================================

// TR-808 Hand Clap - Multiple short noise bursts
SynthDef(\clap808, { |out=0, amp=0.5, decay=0.08|
    var env, sig, delays;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    // Create multiple delayed bursts for realistic clap
    sig = HPF.ar(WhiteNoise.ar(1), 1500);
    sig = BPF.ar(sig, 2500, 0.5);
    delays = Mix([
        sig,
        DelayN.ar(sig, 0.01, 0.01) * 0.8,
        DelayN.ar(sig, 0.02, 0.02) * 0.6,
        DelayN.ar(sig, 0.03, 0.03) * 0.4
    ]) * 0.25;
    sig = delays * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Cowbell - TR-808 style
SynthDef(\cowbell808, { |out=0, amp=0.5, freq=540, decay=0.5|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    // Two square waves for metallic tone
    sig = Mix([
        Pulse.ar(freq, 0.5),
        Pulse.ar(freq * 1.5, 0.5) * 0.5
    ]);
    sig = BPF.ar(sig, freq * 2, 0.3);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Rimshot - TR-808 style
SynthDef(\rimshot808, { |out=0, amp=0.5, freq=400, decay=0.05|
    var env, sig, click;
    env = EnvGen.kr(Env.perc(0.0001, decay, 1, -8), doneAction: 2);
    sig = SinOsc.ar(freq) * 0.5;
    click = HPF.ar(WhiteNoise.ar(0.5), 3000);
    sig = (sig + click) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// LATIN PERCUSSION
// ============================================================================

// Conga - High
SynthDef(\congaHigh, { |out=0, amp=0.6, freq=400, decay=0.3, tone=0.5|
    var env, pitchEnv, sig, noise;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.05, 1.3, -8));
    sig = SinOsc.ar(freq * pitchEnv);
    // Add skin texture
    noise = BPF.ar(WhiteNoise.ar(tone * 0.3), freq * 2, 2);
    sig = (sig + noise) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Conga - Low
SynthDef(\congaLow, { |out=0, amp=0.6, freq=200, decay=0.4, tone=0.5|
    var env, pitchEnv, sig, noise;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.05, 1.3, -8));
    sig = SinOsc.ar(freq * pitchEnv);
    noise = BPF.ar(WhiteNoise.ar(tone * 0.3), freq * 2, 2);
    sig = (sig + noise) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Bongo - High
SynthDef(\bongoHigh, { |out=0, amp=0.6, freq=500, decay=0.2|
    var env, pitchEnv, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.03, 1.4, -10));
    sig = SinOsc.ar(freq * pitchEnv);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Bongo - Low
SynthDef(\bongoLow, { |out=0, amp=0.6, freq=300, decay=0.25|
    var env, pitchEnv, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    pitchEnv = EnvGen.kr(Env.perc(0.001, 0.03, 1.4, -10));
    sig = SinOsc.ar(freq * pitchEnv);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Timbale - High
SynthDef(\timbaleHigh, { |out=0, amp=0.6, freq=350, decay=0.4, ring=0.3|
    var env, sig, ringSig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -2), doneAction: 2);
    sig = SinOsc.ar(freq);
    // Add metallic ring
    ringSig = Mix([
        SinOsc.ar(freq * 2.1) * ring,
        SinOsc.ar(freq * 3.2) * ring * 0.5
    ]);
    sig = (sig + ringSig) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Timbale - Low
SynthDef(\timbaleLow, { |out=0, amp=0.6, freq=250, decay=0.5, ring=0.3|
    var env, sig, ringSig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -2), doneAction: 2);
    sig = SinOsc.ar(freq);
    ringSig = Mix([
        SinOsc.ar(freq * 2.1) * ring,
        SinOsc.ar(freq * 3.2) * ring * 0.5
    ]);
    sig = (sig + ringSig) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// WORLD PERCUSSION
// ============================================================================

// Tambourine - Jingles
SynthDef(\tambourine, { |out=0, amp=0.4, decay=0.3, tone=5000|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    // Multiple band-pass filters for jingle sound
    sig = Mix([
        BPF.ar(WhiteNoise.ar(1), tone * 0.8, 0.1),
        BPF.ar(WhiteNoise.ar(1), tone * 1.0, 0.1),
        BPF.ar(WhiteNoise.ar(1), tone * 1.2, 0.1),
        BPF.ar(WhiteNoise.ar(1), tone * 1.5, 0.1)
    ]) * 0.25;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Shaker/Maracas
SynthDef(\shaker, { |out=0, amp=0.3, decay=0.1|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    sig = HPF.ar(WhiteNoise.ar(1), 4000);
    sig = BPF.ar(sig, 8000, 0.5);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Claves - Wooden click
SynthDef(\claves, { |out=0, amp=0.5, freq=2500, decay=0.03|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.0001, decay, 1, -8), doneAction: 2);
    sig = BPF.ar(WhiteNoise.ar(1), freq, 0.1);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Woodblock
SynthDef(\woodblock, { |out=0, amp=0.5, freq=800, decay=0.05|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.0001, decay, 1, -6), doneAction: 2);
    sig = BPF.ar(Impulse.ar(0), freq, 0.2);
    sig = sig + (BPF.ar(WhiteNoise.ar(0.3), freq * 2, 0.3));
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Triangle - Metallic ring
SynthDef(\triangle, { |out=0, amp=0.4, freq=3000, decay=1.0|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -2), doneAction: 2);
    // Multiple sine waves for metallic character
    sig = Mix([
        SinOsc.ar(freq),
        SinOsc.ar(freq * 1.33) * 0.5,
        SinOsc.ar(freq * 1.67) * 0.3,
        SinOsc.ar(freq * 2.0) * 0.2
    ]) * 0.3;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Agogô - High
SynthDef(\agogoHigh, { |out=0, amp=0.5, freq=3000, decay=0.5|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq),
        SinOsc.ar(freq * 1.5) * 0.4
    ]);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Agogô - Low
SynthDef(\agogoLow, { |out=0, amp=0.5, freq=2000, decay=0.5|
    var env, sig;
    env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    sig = Mix([
        SinOsc.ar(freq),
        SinOsc.ar(freq * 1.5) * 0.4
    ]);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

"✅ Comprehensive Drum & Percussion SynthDefs loaded".postln;
"".postln;
"   KICKS: kick808, kick909, kickAcoustic".postln;
"   SNARES: snare808, snare909, snareAcoustic".postln;
"   HI-HATS: hihatClosed808, hihatOpen808, hihatClosed909, hihatOpen909".postln;
"   TOMS: tomLow808, tomMid808, tomHigh808".postln;
"   CYMBALS: cymbalCrash, cymbalRide, cymbalSplash".postln;
"   PERCUSSION: clap808, cowbell808, rimshot808".postln;
"   LATIN: congaHigh, congaLow, bongoHigh, bongoLow, timbaleHigh, timbaleLow".postln;
"   WORLD: tambourine, shaker, claves, woodblock, triangle, agogoHigh, agogoLow".postln;
"".postln;
"   Total: 30+ drum & percussion instruments".postln;
)


