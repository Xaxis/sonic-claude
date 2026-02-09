// Pad SynthDefs
// Ambient and atmospheric sounds

// Warm pad - Soft, warm pad
SynthDef(\warmpad, { |out=0, freq=220, amp=0.4, gate=1, attack=2.0, release=3.0, cutoff=2000|
    var sig, env, filter;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = Mix.ar([
        Saw.ar(freq * [1, 1.01, 0.99]),
        Pulse.ar(freq * [0.5, 0.501], 0.5)
    ]);
    filter = LPF.ar(sig, cutoff);
    Out.ar(out, filter * env * amp * 0.2 ! 2);
}).add;

// String pad - String ensemble
SynthDef(\strings, { |out=0, freq=220, amp=0.4, gate=1, attack=1.5, release=2.5, vibrato=5|
    var sig, env, vib;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    vib = SinOsc.kr(vibrato).range(0.98, 1.02);
    sig = Mix.ar(Saw.ar(freq * [1, 1.01, 0.99, 2, 2.01] * vib));
    Out.ar(out, sig * env * amp * 0.15 ! 2);
}).add;

// Choir pad - Vocal-like pad
SynthDef(\choir, { |out=0, freq=220, amp=0.4, gate=1, attack=2.0, release=3.0|
    var sig, env, formants;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = Saw.ar(freq * [1, 1.01, 0.99]);
    formants = BPF.ar(sig, [800, 1150, 2900], [0.1, 0.1, 0.1]).sum;
    Out.ar(out, formants * env * amp ! 2);
}).add;

// Ambient pad - Ethereal atmosphere
SynthDef(\ambient, { |out=0, freq=220, amp=0.3, gate=1, attack=3.0, release=4.0|
    var sig, env;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = Mix.ar([
        SinOsc.ar(freq * [1, 1.5, 2, 3]),
        LFTri.ar(freq * [0.5, 0.75])
    ]);
    Out.ar(out, sig * env * amp * 0.15 ! 2);
}).add;

// Shimmer pad - Bright, shimmering pad
SynthDef(\shimmer, { |out=0, freq=220, amp=0.3, gate=1, attack=2.5, release=3.5, modRate=0.2|
    var sig, env, mod;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    mod = SinOsc.kr(modRate).range(0.95, 1.05);
    sig = Mix.ar(SinOsc.ar(freq * [1, 2, 3, 4, 5] * mod));
    Out.ar(out, sig * env * amp * 0.15 ! 2);
}).add;

