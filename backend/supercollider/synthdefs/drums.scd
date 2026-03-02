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

// ============================================================================
// EXTENDED DRUM MACHINES — 606 / 707 / 909 CLAP / COWBELL 909
// ============================================================================

// TR-606 Kick — thin, electronic, higher pitch
SynthDef(\kick606, { |out=0, amp=0.7, freq=80, decay=0.18, pitchRatio=2.2|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -6), doneAction: 2);
    var pitchEnv = EnvGen.kr(Env.perc(0.001, 0.05, pitchRatio, -12));
    var click = HPF.ar(WhiteNoise.ar(0.12), 2500) * EnvGen.kr(Env.perc(0.001, 0.018));
    var sig = SinOsc.ar(freq * pitchEnv) + click;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-707 Kick — PCM-like, punchy mid-range
SynthDef(\kick707, { |out=0, amp=0.8, freq=50, decay=0.28, pitchRatio=2.8|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    var pitchEnv = EnvGen.kr(Env.perc(0.001, 0.07, pitchRatio, -9));
    var noise = HPF.ar(WhiteNoise.ar(0.18), 900) * EnvGen.kr(Env.perc(0.0001, 0.015));
    var sig = SinOsc.ar(freq * pitchEnv) + noise;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-606 Snare — thin, buzzy, lo-fi
SynthDef(\snare606, { |out=0, amp=0.5, freq=220, decay=0.09, noiseDecay=0.11|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -7), doneAction: 2);
    var noiseEnv = EnvGen.kr(Env.perc(0.001, noiseDecay, 1, -5));
    var tonal = SinOsc.ar(freq) * 0.4 * env;
    var noise = BPF.ar(WhiteNoise.ar(1), 3200, 1.6) * noiseEnv;
    var sig = (tonal + noise) * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-707 Snare — crisp, sharp attack
SynthDef(\snare707, { |out=0, amp=0.6, freq=190, decay=0.1, noiseDecay=0.14, snap=0.45|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -6), doneAction: 2);
    var noiseEnv = EnvGen.kr(Env.perc(0.001, noiseDecay, 1, -4));
    var snapEnv = EnvGen.kr(Env.perc(0.0001, 0.014));
    var tonal = SinOsc.ar(freq) * 0.3 * env;
    var noise = HPF.ar(WhiteNoise.ar(1), 2000) * noiseEnv;
    var snapSig = HPF.ar(WhiteNoise.ar(snap), 6500) * snapEnv;
    var sig = (tonal + noise + snapSig) * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-909 Clap — metallic layered clap
SynthDef(\clap909, { |out=0, amp=0.6, decay=0.12|
    var env = EnvGen.kr(Env.perc(0.0001, decay, 1, -4), doneAction: 2);
    var noise = BPF.ar(HPF.ar(WhiteNoise.ar(1), 2000), 3600, 0.35);
    var sig = (noise
        + DelayN.ar(noise, 0.008, 0.008) * 0.75
        + DelayN.ar(noise, 0.016, 0.016) * 0.55
        + DelayN.ar(noise, 0.022, 0.022) * 0.35) * 0.35;
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-606 Closed Hi-Hat — thin, short, buzzy
SynthDef(\hihatClosed606, { |out=0, amp=0.4, decay=0.035, tone=7200|
    var env = EnvGen.kr(Env.perc(0.0001, decay, 1, -12), doneAction: 2);
    var sig = HPF.ar(WhiteNoise.ar(1), tone);
    sig = BPF.ar(sig, tone * 1.85, 0.22);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-606 Open Hi-Hat — thin, longer
SynthDef(\hihatOpen606, { |out=0, amp=0.4, decay=0.22, tone=7200|
    var env = EnvGen.kr(Env.perc(0.0001, decay, 1, -3), doneAction: 2);
    var sig = HPF.ar(WhiteNoise.ar(1), tone);
    sig = BPF.ar(sig, tone * 1.85, 0.22);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// TR-909 Cowbell — brighter, sharper than 808
SynthDef(\cowbell909, { |out=0, amp=0.5, freq=540, decay=0.28|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -5), doneAction: 2);
    var sig = Mix([
        Pulse.ar(freq, 0.5),
        Pulse.ar(freq * 1.47, 0.5) * 0.65
    ]) * 0.4;
    sig = BPF.ar(sig, freq * 2.5, 0.45);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// HAND PERCUSSION — CLAPS / SNAPS
// ============================================================================

// Hand Clap — natural human clap with smack transient
SynthDef(\handclap, { |out=0, amp=0.5, decay=0.13|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    var smack = HPF.ar(WhiteNoise.ar(1), 3500) * EnvGen.kr(Env.perc(0.0001, 0.018));
    var body = BPF.ar(HPF.ar(WhiteNoise.ar(1), 1200), 2400, 0.8);
    var sig = (body + smack * 0.5) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Finger Snap — dry, bright click
SynthDef(\fingersnap, { |out=0, amp=0.4, decay=0.045|
    var env = EnvGen.kr(Env.perc(0.0001, decay, 1, -8), doneAction: 2);
    var sig = BPF.ar(WhiteNoise.ar(1), 2200, 0.28);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Maracas — dry rattling seeds
SynthDef(\maracas, { |out=0, amp=0.35, decay=0.07|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -5), doneAction: 2);
    var sig = HPF.ar(WhiteNoise.ar(1), 5800);
    sig = BPF.ar(sig, 9200, 0.75);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Cabasa / Afuche — longer metallic rattling
SynthDef(\cabasa, { |out=0, amp=0.35, decay=0.14|
    var env = EnvGen.kr(Env.perc(0.006, decay, 1, -4), doneAction: 2);
    var sig = HPF.ar(WhiteNoise.ar(1), 3000);
    sig = BPF.ar(sig, 5200, 1.1);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// ============================================================================
// GLOBAL PERCUSSION — DJEMBE / TABLA / SURDO / PANDEIRO / CUICA
// ============================================================================

// Djembe — West African bass tone
SynthDef(\djembe, { |out=0, amp=0.7, freq=92, decay=0.5, tone=0.4|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    var pitchEnv = EnvGen.kr(Env.perc(0.001, 0.09, 1.6, -7));
    var body = SinOsc.ar(freq * pitchEnv);
    var skin = BPF.ar(WhiteNoise.ar(tone), freq * 3.2, 1.4) * EnvGen.kr(Env.perc(0.001, 0.065));
    var sig = (body + skin) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Djembe Slap — high-pitched sharp slap tone
SynthDef(\djembeSlap, { |out=0, amp=0.6, freq=360, decay=0.16|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -5), doneAction: 2);
    var pitchEnv = EnvGen.kr(Env.perc(0.001, 0.04, 1.9, -10));
    var body = SinOsc.ar(freq * pitchEnv);
    var snap = HPF.ar(WhiteNoise.ar(0.45), 2800) * EnvGen.kr(Env.perc(0.0001, 0.028));
    var sig = (body + snap) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Tabla — Indian tabla, right-hand open tone (na)
SynthDef(\tabla, { |out=0, amp=0.6, freq=310, decay=0.35|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    var pitchEnv = EnvGen.kr(Env.perc(0.001, 0.065, 1.55, -8));
    var body = Mix([
        SinOsc.ar(freq * pitchEnv),
        SinOsc.ar(freq * pitchEnv * 2.01) * 0.28,
        SinOsc.ar(freq * pitchEnv * 3.03) * 0.12
    ]) * 0.7;
    var skin = BPF.ar(WhiteNoise.ar(0.18), freq * 4, 2.0) * EnvGen.kr(Env.perc(0.001, 0.04));
    var sig = (body + skin) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Tabla Low — left-hand baya (bass drone/stroke)
SynthDef(\tablaLow, { |out=0, amp=0.7, freq=78, decay=0.6|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    var pitchEnv = EnvGen.kr(Env.perc(0.001, 0.18, 1.85, -5));
    var body = Mix([
        SinOsc.ar(freq * pitchEnv),
        SinOsc.ar(freq * pitchEnv * 2.02) * 0.18
    ]) * 0.55;
    var sig = body * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Surdo — Brazilian surdo bass drum (deep, resonant)
SynthDef(\surdo, { |out=0, amp=0.85, freq=55, decay=0.7|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    var pitchEnv = EnvGen.kr(Env.perc(0.001, 0.22, 1.75, -5));
    var body = SinOsc.ar(freq * pitchEnv);
    var beater = HPF.ar(WhiteNoise.ar(0.14), 1600) * EnvGen.kr(Env.perc(0.001, 0.025));
    var sig = (body + beater) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Pandeiro — Brazilian frame drum (body + jingles)
SynthDef(\pandeiro, { |out=0, amp=0.5, freq=410, decay=0.22|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -4), doneAction: 2);
    var pitchEnv = EnvGen.kr(Env.perc(0.001, 0.05, 1.45, -8));
    var body = SinOsc.ar(freq * pitchEnv) * 0.55;
    var jingles = Mix([
        BPF.ar(WhiteNoise.ar(1), 4200, 0.1),
        BPF.ar(WhiteNoise.ar(1), 6400, 0.1),
        BPF.ar(WhiteNoise.ar(1), 8500, 0.1)
    ]) / 3 * EnvGen.kr(Env.perc(0.001, decay * 1.3));
    var sig = (body + jingles * 0.45) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Cuica — Brazilian friction drum (wobbly pitch)
SynthDef(\cuica, { |out=0, amp=0.5, freq=260, decay=0.32, squeak=0.5|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    var pitchWobble = SinOsc.kr(14, 0, squeak * 0.06);
    var sig = SinOsc.ar(freq * (1 + pitchWobble));
    sig = LPF.ar(sig, 1600);
    sig = sig * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Taiko — Japanese ceremonial drum (deep, resonant)
SynthDef(\taiko, { |out=0, amp=0.9, freq=42, decay=0.8|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -2), doneAction: 2);
    var pitchEnv = EnvGen.kr(Env.perc(0.001, 0.12, 1.6, -6));
    var body = Mix([
        SinOsc.ar(freq * pitchEnv),
        SinOsc.ar(freq * pitchEnv * 1.52) * 0.22,
        SinOsc.ar(freq * pitchEnv * 2.05) * 0.1
    ]) * 0.65;
    var stick = HPF.ar(WhiteNoise.ar(0.25), 2000) * EnvGen.kr(Env.perc(0.001, 0.04));
    var sig = (body + stick) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Cajon — Peruvian box drum (bass thump)
SynthDef(\cajon, { |out=0, amp=0.75, freq=70, decay=0.35|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -3), doneAction: 2);
    var pitchEnv = EnvGen.kr(Env.perc(0.001, 0.08, 1.5, -7));
    var body = SinOsc.ar(freq * pitchEnv);
    var wood = BPF.ar(HPF.ar(WhiteNoise.ar(0.3), 1500), 3000, 0.9) * EnvGen.kr(Env.perc(0.001, 0.05));
    var sig = (body + wood) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

// Cajon Slap — sharp slap tone on cajon
SynthDef(\cajonSlap, { |out=0, amp=0.6, freq=280, decay=0.18|
    var env = EnvGen.kr(Env.perc(0.001, decay, 1, -5), doneAction: 2);
    var pitchEnv = EnvGen.kr(Env.perc(0.001, 0.04, 1.7, -9));
    var body = SinOsc.ar(freq * pitchEnv) * 0.5;
    var crack = HPF.ar(WhiteNoise.ar(0.6), 2200) * EnvGen.kr(Env.perc(0.0001, 0.035));
    var sig = (body + crack) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

"✅ Comprehensive Drum & Percussion SynthDefs loaded".postln;
"".postln;
"   KICKS: kick808, kick909, kickAcoustic, kick606, kick707".postln;
"   SNARES: snare808, snare909, snareAcoustic, snare606, snare707".postln;
"   CLAPS: clap808, clap909, handclap".postln;
"   HI-HATS: hihatClosed808/909/606, hihatOpen808/909/606".postln;
"   TOMS: tomLow808, tomMid808, tomHigh808".postln;
"   CYMBALS: cymbalCrash, cymbalRide, cymbalSplash".postln;
"   COWBELLS: cowbell808, cowbell909".postln;
"   SNAPS: fingersnap, rimshot808".postln;
"   SHAKERS: maracas, cabasa, shaker, tambourine".postln;
"   LATIN: congaHigh, congaLow, bongoHigh, bongoLow, timbaleHigh, timbaleLow, claves, woodblock".postln;
"   GLOBAL: djembe, djembeSlap, tabla, tablaLow, surdo, pandeiro, cuica, taiko, cajon, cajonSlap".postln;
"   MISC: triangle, agogoHigh, agogoLow".postln;
"".postln;
"   Total: 50+ drum & percussion instruments".postln;
)


