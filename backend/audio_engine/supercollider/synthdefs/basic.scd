// Basic Oscillator SynthDefs
// Simple, fundamental waveforms for synthesis

// Sine wave - Pure tone
SynthDef(\sine, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3|
    var sig, env;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = SinOsc.ar(freq) * env * amp;
    Out.ar(out, sig ! 2);
}).add;

// Saw wave - Bright, rich harmonics
SynthDef(\saw, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3, cutoff=2000, resonance=0.3|
    var sig, env, filter;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = Saw.ar(freq);
    filter = RLPF.ar(sig, cutoff, resonance);
    Out.ar(out, filter * env * amp ! 2);
}).add;

// Square wave - Hollow, retro sound
SynthDef(\square, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3, width=0.5|
    var sig, env;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = Pulse.ar(freq, width);
    Out.ar(out, sig * env * amp ! 2);
}).add;

// Triangle wave - Soft, mellow
SynthDef(\triangle, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3|
    var sig, env;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = LFTri.ar(freq);
    Out.ar(out, sig * env * amp ! 2);
}).add;

// Noise - White noise generator
SynthDef(\noise, { |out=0, amp=0.5, gate=1, attack=0.01, release=0.3, cutoff=5000|
    var sig, env, filter;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = WhiteNoise.ar();
    filter = RLPF.ar(sig, cutoff, 0.3);
    Out.ar(out, filter * env * amp ! 2);
}).add;

