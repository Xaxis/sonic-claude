// Bass SynthDefs
// Low-frequency bass instruments

// Sub bass - Deep sub-bass
SynthDef(\subbass, { |out=0, freq=55, amp=0.7, gate=1, attack=0.01, release=0.5, cutoff=200|
    var sig, env, filter;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = SinOsc.ar(freq) + (SinOsc.ar(freq * 2) * 0.3);
    filter = LPF.ar(sig, cutoff);
    Out.ar(out, filter * env * amp ! 2);
}).add;

// Acid bass - TB-303 style acid bass
SynthDef(\acidbass, { |out=0, freq=110, amp=0.6, gate=1, attack=0.01, release=0.3, cutoff=800, resonance=0.7, envAmount=4000|
    var sig, env, filterEnv, filter;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    filterEnv = EnvGen.kr(Env.perc(0.01, 0.2));
    sig = Saw.ar(freq);
    filter = RLPF.ar(sig, (cutoff + (filterEnv * envAmount)).clip(20, 20000), resonance);
    Out.ar(out, filter * env * amp ! 2);
}).add;

// FM bass - Frequency modulation bass
SynthDef(\fmbass, { |out=0, freq=110, amp=0.6, gate=1, attack=0.01, release=0.4, modRatio=2, modIndex=3|
    var sig, env, modulator;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    modulator = SinOsc.ar(freq * modRatio) * freq * modIndex;
    sig = SinOsc.ar(freq + modulator);
    Out.ar(out, sig * env * amp ! 2);
}).add;

// Reese bass - Detuned saw bass
SynthDef(\reesebass, { |out=0, freq=55, amp=0.6, gate=1, attack=0.01, release=0.5, detune=2, cutoff=1500|
    var sig, env, filter;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = Saw.ar([freq, freq + detune, freq - detune]).sum;
    filter = LPF.ar(sig, cutoff);
    Out.ar(out, filter * env * amp * 0.3 ! 2);
}).add;

// Wobble bass - Dubstep wobble
SynthDef(\wobblebass, { |out=0, freq=110, amp=0.6, gate=1, attack=0.01, release=0.5, wobbleRate=4, cutoff=2000|
    var sig, env, wobble, filter;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    wobble = SinOsc.kr(wobbleRate).range(200, cutoff);
    sig = Saw.ar(freq);
    filter = RLPF.ar(sig, wobble, 0.3);
    Out.ar(out, filter * env * amp ! 2);
}).add;

