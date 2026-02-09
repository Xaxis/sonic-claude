// Drum SynthDefs
// Percussion and rhythm instruments

// Kick drum - Deep bass drum
SynthDef(\kick, { |out=0, amp=0.8, freq=60, decay=0.3, click=0.5|
    var sig, env, clickEnv;
    env = EnvGen.kr(Env.perc(0.001, decay), doneAction: 2);
    clickEnv = EnvGen.kr(Env.perc(0.001, 0.01));
    sig = SinOsc.ar(freq * env.exprange(1, 4)) * env;
    sig = sig + (WhiteNoise.ar() * clickEnv * click);
    Out.ar(out, sig * amp ! 2);
}).add;

// Snare drum - Crisp snare
SynthDef(\snare, { |out=0, amp=0.6, freq=200, decay=0.15, noise=0.7|
    var sig, env, tone, noiseComponent;
    env = EnvGen.kr(Env.perc(0.001, decay), doneAction: 2);
    tone = SinOsc.ar([freq, freq * 1.5]) * env;
    noiseComponent = WhiteNoise.ar() * env * noise;
    sig = (tone + noiseComponent) * 0.5;
    Out.ar(out, sig * amp);
}).add;

// Hi-hat - Metallic hi-hat
SynthDef(\hihat, { |out=0, amp=0.4, decay=0.1, cutoff=8000|
    var sig, env;
    env = EnvGen.kr(Env.perc(0.001, decay), doneAction: 2);
    sig = WhiteNoise.ar();
    sig = HPF.ar(sig, cutoff);
    Out.ar(out, sig * env * amp ! 2);
}).add;

// Clap - Hand clap
SynthDef(\clap, { |out=0, amp=0.5, decay=0.2|
    var sig, env;
    env = EnvGen.kr(Env.perc(0.001, decay), doneAction: 2);
    sig = WhiteNoise.ar();
    sig = BPF.ar(sig, 1200, 0.7);
    sig = sig * env;
    Out.ar(out, sig * amp ! 2);
}).add;

// Tom - Tom drum
SynthDef(\tom, { |out=0, amp=0.6, freq=120, decay=0.25|
    var sig, env;
    env = EnvGen.kr(Env.perc(0.01, decay), doneAction: 2);
    sig = SinOsc.ar(freq * env.exprange(1, 2.5)) * env;
    Out.ar(out, sig * amp ! 2);
}).add;

// Cymbal - Crash cymbal
SynthDef(\cymbal, { |out=0, amp=0.5, decay=1.0|
    var sig, env;
    env = EnvGen.kr(Env.perc(0.01, decay), doneAction: 2);
    sig = WhiteNoise.ar();
    sig = HPF.ar(sig, 3000);
    sig = sig * env;
    Out.ar(out, sig * amp ! 2);
}).add;

